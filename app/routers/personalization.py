import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Course, QuizQuestion, QuizAttempt, LevelResult,
    PersonalizedPath, User, LearningSession
)
from ..schemas import (
    QuizSubmitRequest, LevelScalingResultResponse, PersonalizedPathResponse
)
from .users import get_current_user

router = APIRouter(
    prefix="/personalization",
    tags=["AI Personalization & Level Scaling"]
)


def compute_level_scaling(
    self_level: str,
    score: int,
    total: int,
    easy_score: float,
    mod_score: float,
    pro_score: float
) -> str:
    """
    Combines self-assessment level, overall score percentage,
    and difficulty-wise performance to determine the assessed level.
    """
    pct = (score / total) * 100 if total > 0 else 0

    if pct >= 80 and pro_score >= 0.5:
        return "Advanced"
    elif pct >= 50 or mod_score >= 0.5:
        if self_level == "Advanced" and pct < 70:
            return "Intermediate"
        return "Intermediate" if pct >= 40 else "Beginner"
    else:
        return "Beginner"


@router.post("/scale-level", response_model=LevelScalingResultResponse)
def submit_quiz_and_scale(
    data: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        # Fallback to default course 1
        course = db.query(Course).filter(Course.id == 1).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.course_id == course.id).all()
    question_map = {q.id: q for q in questions}

    total_questions = len(data.answers)
    score = 0

    difficulty_counts = {"easy": 0, "moderate": 0, "pro": 0}
    difficulty_correct = {"easy": 0, "moderate": 0, "pro": 0}
    knowledge_gaps = []

    for ans in data.answers:
        q = question_map.get(ans.question_id)
        if not q:
            continue

        diff = q.difficulty.lower()
        if diff not in difficulty_counts:
            diff = "moderate"
            
        difficulty_counts[diff] += 1

        if ans.selected_option == q.correct_answer:
            score += 1
            difficulty_correct[diff] += 1
        else:
            if q.topic and q.topic not in knowledge_gaps:
                knowledge_gaps.append(q.topic)

    easy_pct = (difficulty_correct["easy"] / difficulty_counts["easy"]) if difficulty_counts["easy"] > 0 else 1.0
    mod_pct = (difficulty_correct["moderate"] / difficulty_counts["moderate"]) if difficulty_counts["moderate"] > 0 else 0.5
    pro_pct = (difficulty_correct["pro"] / difficulty_counts["pro"]) if difficulty_counts["pro"] > 0 else 0.0

    assessed_level = compute_level_scaling(
        self_level=data.self_assessed_level,
        score=score,
        total=total_questions if total_questions > 0 else 1,
        easy_score=easy_pct,
        mod_score=mod_pct,
        pro_score=pro_pct
    )

    difficulty_scores_dict = {
        "easy": {"correct": difficulty_correct["easy"], "total": difficulty_counts["easy"], "ratio": easy_pct},
        "moderate": {"correct": difficulty_correct["moderate"], "total": difficulty_counts["moderate"], "ratio": mod_pct},
        "pro": {"correct": difficulty_correct["pro"], "total": difficulty_counts["pro"], "ratio": pro_pct}
    }

    # Store Quiz Attempt
    attempt = QuizAttempt(
        user_id=current_user.id,
        course_id=course.id,
        self_assessed_level=data.self_assessed_level,
        score=score,
        total_questions=total_questions,
        answers_json=json.dumps([a.model_dump() for a in data.answers]),
        difficulty_scores_json=json.dumps(difficulty_scores_dict)
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    if not knowledge_gaps:
        knowledge_gaps = [f"Advanced {course.title} Optimization", "Best Practices & Architecture"]

    # Store Level Result
    level_res = LevelResult(
        user_id=current_user.id,
        course_id=course.id,
        quiz_attempt_id=attempt.id,
        self_level=data.self_assessed_level,
        assessed_level=assessed_level,
        knowledge_gaps_json=json.dumps(knowledge_gaps)
    )
    db.add(level_res)
    db.commit()
    db.refresh(level_res)

    # Generate Personalized Path Content
    modules = generate_personalized_modules(course.title, assessed_level, knowledge_gaps)
    
    path = PersonalizedPath(
        user_id=current_user.id,
        course_id=course.id,
        level_result_id=level_res.id,
        assessed_level=assessed_level,
        title=f"{course.title} — Tailored {assessed_level} Mastery Path",
        objective=f"Bridge key skill gaps in {', '.join(knowledge_gaps[:2])} through targeted instructional modules.",
        modules_json=json.dumps(modules),
        video_title=f"AI Personalized Guide: Master {knowledge_gaps[0] if knowledge_gaps else course.title}",
        video_summary=f"In-depth instructional video breakdown specifically customized for {assessed_level} level, covering core concepts and hands-on demonstrations."
    )
    db.add(path)
    db.commit()
    db.refresh(path)

    # Pre-create learning session
    session = LearningSession(
        user_id=current_user.id,
        course_id=course.id,
        personalized_path_id=path.id,
        status="in_progress",
        progress_pct=0.0
    )
    db.add(session)
    db.commit()

    pct = (score / total_questions) * 100 if total_questions > 0 else 0.0

    return LevelScalingResultResponse(
        attempt_id=attempt.id,
        course_id=course.id,
        self_level=data.self_assessed_level,
        assessed_level=assessed_level,
        score=score,
        total_questions=total_questions,
        percentage=pct,
        difficulty_scores=difficulty_scores_dict,
        knowledge_gaps=knowledge_gaps
    )


def generate_personalized_modules(course_title: str, level: str, gaps: List[str]) -> List[Dict[str, Any]]:
    modules = []
    
    # Primary focus module addressing identified gap
    if gaps:
        modules.append({
            "step": 1,
            "title": f"Core Focus: {gaps[0]}",
            "duration": "15 mins",
            "description": f"Targeted explanation addressing identified weakness in {gaps[0]}.",
            "status": "active"
        })
    
    if len(gaps) > 1:
        modules.append({
            "step": 2,
            "title": f"Reinforcement: {gaps[1]}",
            "duration": "20 mins",
            "description": f"Deep dive into {gaps[1]} with practical examples.",
            "status": "pending"
        })
    else:
        modules.append({
            "step": 2,
            "title": f"{level} Practical Application",
            "duration": "25 mins",
            "description": f"Applied exercises for {course_title} at the {level} tier.",
            "status": "pending"
        })

    modules.append({
        "step": 3,
        "title": "Comprehensive Synthesis & Assessment Prep",
        "duration": "10 mins",
        "description": "Summary review and post-learning evaluation preparation.",
        "status": "pending"
    })

    return modules


@router.get("/learning-path/latest", response_model=PersonalizedPathResponse)
def get_latest_learning_path(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    path = (
        db.query(PersonalizedPath)
        .filter(PersonalizedPath.user_id == current_user.id)
        .order_by(PersonalizedPath.id.desc())
        .first()
    )

    if not path:
        # Generate default path if none exists
        course = db.query(Course).first()
        c_title = course.title if course else "Python Programming"
        c_id = course.id if course else 1
        
        return PersonalizedPathResponse(
            id=1,
            course_id=c_id,
            course_title=c_title,
            assessed_level="Beginner",
            title=f"{c_title} — Foundation Path",
            objective="Comprehensive breakdown of core fundamentals and syntax.",
            modules=[
                {"step": 1, "title": "Syntax & Basics", "duration": "15 mins", "description": "Fundamentals", "status": "active"},
                {"step": 2, "title": "Data Structures", "duration": "20 mins", "description": "Lists and Dictionaries", "status": "pending"}
            ],
            video_title=f"AI Instructional Guide: {c_title} Overview",
            video_summary="Guided step-by-step introduction designed for fast comprehension.",
            knowledge_gaps=["Core Fundamentals", "Basic Concepts"]
        )

    course = db.query(Course).filter(Course.id == path.course_id).first()
    level_res = db.query(LevelResult).filter(LevelResult.id == path.level_result_id).first()
    gaps = json.loads(level_res.knowledge_gaps_json) if level_res else ["General Skill Refinement"]

    return PersonalizedPathResponse(
        id=path.id,
        course_id=path.course_id,
        course_title=course.title if course else "Course Learning Path",
        assessed_level=path.assessed_level,
        title=path.title,
        objective=path.objective,
        modules=json.loads(path.modules_json),
        video_title=path.video_title,
        video_summary=path.video_summary,
        knowledge_gaps=gaps
    )
