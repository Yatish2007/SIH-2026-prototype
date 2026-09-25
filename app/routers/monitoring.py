import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    LearningSession,
    VideoMonitoringEvent,
    LearningPolicy,
    User
)
from ..schemas import (
    SessionStartRequest,
    SessionStartResponse,
    TelemetryEventRequest,
    TelemetryResponse,
    PolicyValidationStatus
)
from ..services.completion import evaluate_learning_policy, merge_segments
from .users import get_current_user

router = APIRouter(
    prefix="/monitoring",
    tags=["Learning Session Telemetry"]
)


def _segments_from_details(details: Optional[str]) -> List[list]:
    """Extracts [[start,end], ...] watched ranges from telemetry `details`."""
    if not details:
        return []
    try:
        payload = json.loads(details)
    except (ValueError, TypeError):
        return []
    if isinstance(payload, dict) and isinstance(payload.get("segments"), list):
        return payload["segments"]
    if isinstance(payload, list):
        return payload
    return []


@router.post("/sessions/start", response_model=SessionStartResponse)
def start_learning_session(
    data: SessionStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = LearningSession(
        user_id=current_user.id,
        course_id=data.course_id,
        module_id=data.module_id,
        material_id=data.material_id,
        status="in_progress",
        progress_pct=0.0,
        watch_time_seconds=0.0,
        skipped_time_seconds=0.0,
        playback_speed=1.0,
        inactivity_count=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    evt = VideoMonitoringEvent(
        session_id=session.id,
        event_type="play",
        timestamp=datetime.utcnow(),
        details=f"Learning session started for course {data.course_id}, material {data.material_id}"
    )
    db.add(evt)
    db.commit()

    return SessionStartResponse(
        session_id=session.id,
        course_id=session.course_id,
        status=session.status,
        progress_pct=session.progress_pct,
        message="Learning session initialized. Observable learning signals will be recorded."
    )


@router.post("/telemetry", response_model=TelemetryResponse)
def record_video_telemetry(
    data: TelemetryEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(LearningSession).filter(LearningSession.id == data.session_id).first()

    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Learning session not found for this user")

    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == session.course_id).first()

    # Log the observable telemetry event
    evt = VideoMonitoringEvent(
        session_id=session.id,
        event_type=data.event_type,
        timestamp=datetime.utcnow(),
        details=data.details or f"{data.event_type} at {data.progress_pct}%"
    )
    db.add(evt)

    # Accumulate metrics
    if data.watch_time_seconds and data.watch_time_seconds > 0:
        session.watch_time_seconds += data.watch_time_seconds
    if data.skipped_time_seconds and data.skipped_time_seconds > 0:
        session.skipped_time_seconds += data.skipped_time_seconds
    if data.playback_speed is not None:
        session.playback_speed = data.playback_speed

    # Merge the union of actually-consumed ranges. Skipped areas are simply
    # not present in the union and therefore never counted as consumed.
    new_segments = _segments_from_details(data.details)
    if new_segments:
        session.consumed_segments_json = merge_segments(session.consumed_segments_json, new_segments)

    # Record observable signals without punishing normal playback behaviour.
    alert_msg = None
    if data.event_type == "seek_skip":
        alert_msg = f"Observable Signal: Forward seek recorded ({data.skipped_time_seconds:.1f}s skipped)."
    elif data.event_type == "focus_lost":
        alert_msg = "Observable Signal: Window/tab focus lost during playback."
    elif data.event_type == "inactivity":
        session.inactivity_count += 1
        alert_msg = "Observable Signal: Trainee inactivity threshold reached."

    # Track highest position reached on the material (completion position).
    if data.progress_pct > session.progress_pct:
        session.progress_pct = min(100.0, data.progress_pct)

    if session.progress_pct >= (policy.minimum_video_watch_percentage if policy else 85.0):
        session.status = "completed"

    session.updated_at = datetime.utcnow()
    db.commit()

    return TelemetryResponse(
        session_id=session.id,
        status=session.status,
        progress_pct=session.progress_pct,
        message=f"Observable signal '{data.event_type}' recorded.",
        policy_compliant=True,
        alert=alert_msg
    )


@router.get("/courses/{course_id}/policy-status", response_model=PolicyValidationStatus)
def get_course_policy_status(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure a course-level policy exists so the response is always meaningful.
    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == course_id).first()
    if not policy:
        owner = (
            db.query(User)
            .filter(User.role.in_(["trainer", "admin"]))
            .order_by(User.id.asc())
            .first()
        )
        if owner:
            policy = LearningPolicy(
                course_id=course_id,
                trainer_id=owner.id,
                minimum_content_percentage=90.0,
                minimum_video_watch_percentage=85.0,
                maximum_skip_percentage=15.0,
                allowed_playback_speed=1.5,
                inactivity_threshold=60,
                require_all_mandatory_modules=True,
                final_assessment_required=True
            )
            db.add(policy)
            db.commit()
            db.refresh(policy)

    result = evaluate_learning_policy(course_id, current_user.id, db)

    return PolicyValidationStatus(
        course_id=course_id,
        user_id=current_user.id,
        is_unlocked=result["policy_passed"],
        policy_passed=result["policy_passed"],
        content_consumption_pct=result["content_consumption_pct"],
        video_watch_pct=result["video_watch_pct"],
        skip_pct=result["skip_pct"],
        mandatory_modules_completed=result["mandatory_modules_completed"],
        mandatory_modules_total=result["mandatory_modules_total"],
        inactivity_violations=result["inactivity_violations"],
        reasons=result["reasons"],
        policy_rules=result["policy_rules"]
    )


@router.get("/session/latest")
def get_latest_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = (
        db.query(LearningSession)
        .filter(LearningSession.user_id == current_user.id)
        .order_by(LearningSession.id.desc())
        .first()
    )

    if not session:
        return {
            "session_id": 0,
            "status": "in_progress",
            "progress_pct": 0.0,
            "watch_time_seconds": 0.0,
            "events_count": 0
        }

    events = db.query(VideoMonitoringEvent).filter(VideoMonitoringEvent.session_id == session.id).all()

    return {
        "session_id": session.id,
        "course_id": session.course_id,
        "status": session.status,
        "progress_pct": session.progress_pct,
        "watch_time_seconds": session.watch_time_seconds,
        "skipped_time_seconds": session.skipped_time_seconds,
        "events_count": len(events)
    }