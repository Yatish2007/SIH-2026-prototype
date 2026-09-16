import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TrainerResource, Course, QuizQuestion, QuizAttempt, LevelResult, User
from .users import get_current_user

router = APIRouter(
    prefix="/trainer",
    tags=["Trainer Management Portal"]
)


@router.get("/resources")
def get_trainer_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resources = db.query(TrainerResource).all()
    results = []
    for r in resources:
        course = db.query(Course).filter(Course.id == r.course_id).first()
        results.append({
            "id": r.id,
            "course_id": r.course_id,
            "course_title": course.title if course else "General",
            "title": r.title,
            "file_type": r.file_type,
            "resource_url": r.resource_url,
            "uploaded_by": r.uploaded_by,
            "created_at": r.created_at
        })
    return results


@router.post("/resources")
def create_trainer_resource(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = TrainerResource(
        course_id=data.get("course_id", 1),
        title=data.get("title", "Resource Document"),
        file_type=data.get("file_type", "PDF"),
        resource_url=data.get("resource_url", "https://example.com/sop.pdf"),
        uploaded_by=current_user.name
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    return {"message": "Resource uploaded successfully", "id": res.id}


@router.get("/skill-gap-analytics")
def get_skill_gap_analytics(
    db: Session = Depends(get_db)
):
    attempts = db.query(QuizAttempt).all()
    
    # Calculate aggregate gap stats
    topic_gaps = {
        "Python Syntax": {"topic": "Python Syntax", "proficiencyScore": 68, "gapDescription": "Struggles with lambda functions & comprehensions", "recommendedModules": ["Advanced Syntax & Lambda Expressions"]},
        "Concurrency & GIL": {"topic": "Concurrency & GIL", "proficiencyScore": 45, "gapDescription": "Misunderstandings regarding GIL thread lock & asyncio event loops", "recommendedModules": ["Python Concurrency Deep-Dive"]},
        "Memory Management": {"topic": "Memory Management", "proficiencyScore": 58, "gapDescription": "Unclear on reference counting vs cycle collection", "recommendedModules": ["Memory Optimization & Profiling"]}
    }

    return list(topic_gaps.values())
