from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import LearningSession, VideoMonitoringEvent, User
from ..schemas import TelemetryEventRequest, TelemetryResponse
from .users import get_current_user

router = APIRouter(
    prefix="/monitoring",
    tags=["AI Video Monitoring Telemetry"]
)


@router.post("/telemetry", response_model=TelemetryResponse)
def record_video_telemetry(
    data: TelemetryEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(LearningSession).filter(LearningSession.id == data.session_id).first()
    
    if not session:
        # Fallback to latest session for user if session_id argument is generic
        session = (
            db.query(LearningSession)
            .filter(LearningSession.user_id == current_user.id)
            .order_by(LearningSession.id.desc())
            .first()
        )
        if not session:
            # Create ad-hoc session
            session = LearningSession(
                user_id=current_user.id,
                course_id=1,
                personalized_path_id=1,
                status="in_progress",
                progress_pct=data.progress_pct
            )
            db.add(session)
            db.commit()
            db.refresh(session)

    # Log telemetry event
    evt = VideoMonitoringEvent(
        session_id=session.id,
        event_type=data.event_type,
        timestamp=datetime.utcnow(),
        details=data.details or f"Progress updated to {data.progress_pct}%"
    )
    db.add(evt)

    # Evaluate anti-cheat / skip policy logic
    msg = "Telemetry recorded successfully"
    
    if data.event_type == "seek_skip":
        # Check if attempt to jump forward excessively
        msg = "AI Telemetry Alert: Excessive forward seek detected. Session marked for watch verification."
        session.status = "incomplete"
    elif data.event_type == "focus_lost":
        msg = "AI Telemetry Alert: User engagement dropped (tab switched/unfocused)."
    elif data.event_type == "completed" or data.progress_pct >= 95.0:
        session.status = "completed"
        session.progress_pct = 100.0
        msg = "Congratulations! Learning session completed."
    else:
        if data.progress_pct > session.progress_pct:
            session.progress_pct = data.progress_pct

    session.updated_at = datetime.utcnow()
    db.commit()

    return TelemetryResponse(
        session_id=session.id,
        status=session.status,
        progress_pct=session.progress_pct,
        message=msg
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
            "events_count": 0
        }

    events = db.query(VideoMonitoringEvent).filter(VideoMonitoringEvent.session_id == session.id).all()

    return {
        "session_id": session.id,
        "status": session.status,
        "progress_pct": session.progress_pct,
        "events_count": len(events)
    }
