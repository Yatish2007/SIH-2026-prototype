from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Course, QuizAttempt, Certificate, LearningSession
from .users import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["Admin Management Portal"]
)


@router.get("/dashboard-stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    trainees = db.query(User).filter(User.role == "trainee").count()
    trainers = db.query(User).filter(User.role == "trainer").count()
    courses = db.query(Course).count()
    attempts = db.query(QuizAttempt).count()
    certificates = db.query(Certificate).count()
    sessions = db.query(LearningSession).count()

    return {
        "total_users": total_users,
        "trainee_count": trainees,
        "trainer_count": trainers,
        "active_courses": courses,
        "total_quiz_attempts": attempts,
        "issued_certificates": certificates,
        "active_learning_sessions": sessions,
        "system_status": "Operational",
        "notifications": [
            {"id": 1, "title": "System Update", "message": "AI Level Scaling Engine upgraded to v2.4", "time": "10 mins ago"},
            {"id": 2, "title": "New Trainer Upload", "message": "SOP-Safety-2026 resource uploaded by Trainer", "time": "1 hour ago"}
        ]
    }


@router.get("/users")
def list_all_users(
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "status": "Active"} for u in users]
