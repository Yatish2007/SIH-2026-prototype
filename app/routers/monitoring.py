from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    LearningSession,
    VideoMonitoringEvent,
    LearningPolicy,
    CourseModule,
    CourseMaterial,
    CourseCompletion,
    User
)
from ..schemas import (
    SessionStartRequest,
    SessionStartResponse,
    TelemetryEventRequest,
    TelemetryResponse,
    PolicyValidationStatus
)
from .users import get_current_user

router = APIRouter(
    prefix="/monitoring",
    tags=["AI Video Monitoring Telemetry"]
)


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

    # Log initial start event
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
        message="AI Video Monitoring Session initialized. Observable learning signals active."
    )


@router.post("/telemetry", response_model=TelemetryResponse)
def record_video_telemetry(
    data: TelemetryEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(LearningSession).filter(LearningSession.id == data.session_id).first()

    if not session:
        # Fallback to latest session for user
        session = (
            db.query(LearningSession)
            .filter(LearningSession.user_id == current_user.id)
            .order_by(LearningSession.id.desc())
            .first()
        )
        if not session:
            session = LearningSession(
                user_id=current_user.id,
                course_id=1,
                status="in_progress",
                progress_pct=data.progress_pct
            )
            db.add(session)
            db.commit()
            db.refresh(session)

    # Fetch trainer policy to validate telemetry against
    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == session.course_id).first()
    max_speed = policy.allowed_playback_speed if policy else 1.5
    max_skip_pct = policy.maximum_skip_percentage if policy else 15.0

    # Log observable telemetry event
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

    alert_msg = None
    policy_compliant = True

    # Check anti-skip & telemetry rules
    if data.event_type == "speed_change" and (data.playback_speed or 1.0) > max_speed:
        policy_compliant = False
        alert_msg = f"Learning Policy Alert: Playback speed ({data.playback_speed}x) exceeds trainer limit of {max_speed}x."
    elif data.event_type == "seek_skip":
        alert_msg = f"Observable Signal: Fast forward seek detected ({data.skipped_time_seconds:.1f}s skipped)."
    elif data.event_type == "focus_lost":
        alert_msg = "Observable Signal: Window/tab focus lost during playback."
    elif data.event_type == "inactivity":
        session.inactivity_count += 1
        alert_msg = "Observable Signal: Trainee inactivity threshold reached."

    # Update progress
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
        policy_compliant=policy_compliant,
        alert=alert_msg
    )


@router.get("/courses/{course_id}/policy-status", response_model=PolicyValidationStatus)
def get_course_policy_status(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == course_id).first()
    if not policy:
        # Default policy
        policy = LearningPolicy(
            course_id=course_id,
            trainer_id=1,
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

    # Get all learning sessions of user for this course
    sessions = (
        db.query(LearningSession)
        .filter(LearningSession.user_id == current_user.id, LearningSession.course_id == course_id)
        .all()
    )

    max_progress = max([s.progress_pct for s in sessions], default=0.0)
    total_watch = sum(s.watch_time_seconds for s in sessions)
    total_skip = sum(s.skipped_time_seconds for s in sessions)
    inactivity_violations = sum(s.inactivity_count for s in sessions)

    # Calculate module completion
    mandatory_modules = (
        db.query(CourseModule)
        .filter(CourseModule.course_id == course_id, CourseModule.is_mandatory == True)
        .all()
    )
    total_mandatory = len(mandatory_modules)

    # If sessions completed or progress >= policy minimum watch percentage
    is_video_watched = max_progress >= policy.minimum_video_watch_percentage
    content_consumption = max_progress

    # Modules completed count
    if is_video_watched:
        mandatory_completed = total_mandatory
    else:
        mandatory_completed = max(0, int(total_mandatory * (max_progress / 100)))

    reasons = []
    if content_consumption < policy.minimum_content_percentage:
        reasons.append(
            f"Content consumption ({content_consumption:.0f}%) is below trainer requirement ({policy.minimum_content_percentage:.0f}%)."
        )
    if not is_video_watched:
        reasons.append(
            f"Video watch time ({max_progress:.0f}%) is below required minimum ({policy.minimum_video_watch_percentage:.0f}%)."
        )
    if policy.require_all_mandatory_modules and mandatory_completed < total_mandatory:
        reasons.append(
            f"Mandatory modules incomplete ({mandatory_completed}/{total_mandatory} completed)."
        )

    policy_passed = len(reasons) == 0
    is_unlocked = policy_passed

    # Update or create CourseCompletion record
    comp = (
        db.query(CourseCompletion)
        .filter(CourseCompletion.user_id == current_user.id, CourseCompletion.course_id == course_id)
        .first()
    )
    if not comp:
        comp = CourseCompletion(
            user_id=current_user.id,
            course_id=course_id,
            learning_policy_passed=policy_passed,
            final_assessment_passed=False
        )
        db.add(comp)
        db.commit()
    else:
        if policy_passed and not comp.learning_policy_passed:
            comp.learning_policy_passed = True
            db.commit()

    return PolicyValidationStatus(
        course_id=course_id,
        user_id=current_user.id,
        is_unlocked=is_unlocked,
        policy_passed=policy_passed,
        content_consumption_pct=round(content_consumption, 1),
        video_watch_pct=round(max_progress, 1),
        skip_pct=round(total_skip, 1),
        mandatory_modules_completed=mandatory_completed,
        mandatory_modules_total=total_mandatory,
        inactivity_violations=inactivity_violations,
        reasons=reasons,
        policy_rules={
            "minimum_content_percentage": policy.minimum_content_percentage,
            "minimum_video_watch_percentage": policy.minimum_video_watch_percentage,
            "maximum_skip_percentage": policy.maximum_skip_percentage,
            "allowed_playback_speed": policy.allowed_playback_speed,
            "inactivity_threshold": policy.inactivity_threshold,
            "require_all_mandatory_modules": policy.require_all_mandatory_modules
        }
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
