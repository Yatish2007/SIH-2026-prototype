import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Course,
    CourseModule,
    CourseMaterial,
    LearningPolicy,
    FinalAssessment,
    FinalAssessmentQuestion,
    FinalAssessmentAttempt,
    CourseCompletion,
    LearningSession,
    VideoMonitoringEvent,
    QuizAttempt,
    User,
    TrainerResource
)
from ..schemas import (
    ModuleCreate,
    ModuleUpdate,
    ModuleResponse,
    MaterialResponse,
    LearningPolicyCreate,
    LearningPolicyResponse,
    AssessmentSettingsUpdate,
    FinalQuestionCreate,
    FinalQuestionUpdate,
    FinalQuestionTrainerResponse
)
from ..storage import save_uploaded_file
from .users import get_current_user

router = APIRouter(
    prefix="/trainer",
    tags=["Trainer Management Portal"]
)


def verify_trainer_access(current_user: User):
    if current_user.role not in {"trainer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Trainer role required"
        )


# ==========================================
# Module Management
# ==========================================

@router.post("/courses/{course_id}/modules", response_model=ModuleResponse)
def create_course_module(
    course_id: int,
    data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get next order index if not specified
    if not data.order_index:
        count = db.query(CourseModule).filter(CourseModule.course_id == course_id).count()
        order_idx = count + 1
    else:
        order_idx = data.order_index

    module = CourseModule(
        course_id=course_id,
        title=data.title,
        description=data.description,
        order_index=order_idx,
        is_mandatory=data.is_mandatory if data.is_mandatory is not None else True
    )
    db.add(module)
    db.commit()
    db.refresh(module)

    return ModuleResponse(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order_index=module.order_index,
        is_mandatory=module.is_mandatory,
        materials=[],
        created_at=module.created_at
    )


@router.get("/courses/{course_id}/modules", response_model=List[ModuleResponse])
def get_course_modules(
    course_id: int,
    db: Session = Depends(get_db)
):
    modules = (
        db.query(CourseModule)
        .filter(CourseModule.course_id == course_id)
        .order_by(CourseModule.order_index.asc())
        .all()
    )

    results = []
    for m in modules:
        materials = (
            db.query(CourseMaterial)
            .filter(CourseMaterial.module_id == m.id)
            .order_by(CourseMaterial.id.asc())
            .all()
        )
        mat_responses = [
            MaterialResponse(
                id=mat.id,
                course_id=mat.course_id,
                module_id=mat.module_id,
                trainer_id=mat.trainer_id,
                title=mat.title,
                description=mat.description,
                material_type=mat.material_type,
                file_name=mat.file_name,
                file_path=mat.file_path,
                file_url=mat.file_url,
                mime_type=mat.mime_type,
                file_size=mat.file_size,
                duration_seconds=mat.duration_seconds,
                created_at=mat.created_at
            )
            for mat in materials
        ]
        results.append(
            ModuleResponse(
                id=m.id,
                course_id=m.course_id,
                title=m.title,
                description=m.description,
                order_index=m.order_index,
                is_mandatory=m.is_mandatory,
                materials=mat_responses,
                created_at=m.created_at
            )
        )
    return results


@router.put("/modules/{module_id}", response_model=ModuleResponse)
def update_course_module(
    module_id: int,
    data: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    if data.title is not None:
        module.title = data.title
    if data.description is not None:
        module.description = data.description
    if data.order_index is not None:
        module.order_index = data.order_index
    if data.is_mandatory is not None:
        module.is_mandatory = data.is_mandatory

    module.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(module)

    materials = (
        db.query(CourseMaterial)
        .filter(CourseMaterial.module_id == module.id)
        .all()
    )

    return ModuleResponse(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order_index=module.order_index,
        is_mandatory=module.is_mandatory,
        materials=[MaterialResponse.model_validate(m) for m in materials],
        created_at=module.created_at
    )


@router.delete("/modules/{module_id}")
def delete_course_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Delete all materials inside module
    db.query(CourseMaterial).filter(CourseMaterial.module_id == module_id).delete()
    db.delete(module)
    db.commit()
    return {"message": f"Module {module_id} and its materials deleted successfully"}


# ==========================================
# Learning Material Uploads
# ==========================================

@router.post("/courses/{course_id}/modules/{module_id}/materials", response_model=MaterialResponse)
async def upload_course_material(
    course_id: int,
    module_id: int,
    title: str = Form(...),
    material_type: str = Form(...), # video, document, presentation, note
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    module = db.query(CourseModule).filter(CourseModule.id == module_id, CourseModule.course_id == course_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found in this course")

    # Save to storage (Supabase or local HTTP range streaming)
    saved_meta = await save_uploaded_file(file, course_id, module_id, material_type)

    material = CourseMaterial(
        course_id=course_id,
        module_id=module_id,
        trainer_id=current_user.id,
        title=title,
        description=description,
        material_type=material_type.lower(),
        file_name=saved_meta["file_name"],
        file_path=saved_meta["file_path"],
        file_url=saved_meta["file_url"],
        mime_type=saved_meta["mime_type"],
        file_size=saved_meta["file_size"],
        duration_seconds=None
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    return MaterialResponse(
        id=material.id,
        course_id=material.course_id,
        module_id=material.module_id,
        trainer_id=material.trainer_id,
        title=material.title,
        description=material.description,
        material_type=material.material_type,
        file_name=material.file_name,
        file_path=material.file_path,
        file_url=material.file_url,
        mime_type=material.mime_type,
        file_size=material.file_size,
        duration_seconds=material.duration_seconds,
        created_at=material.created_at
    )


@router.delete("/materials/{material_id}")
def delete_course_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    db.delete(material)
    db.commit()
    return {"message": "Material deleted successfully"}


# ==========================================
# Learning Policy Configuration
# ==========================================

@router.get("/courses/{course_id}/learning-policy", response_model=LearningPolicyResponse)
def get_learning_policy(
    course_id: int,
    db: Session = Depends(get_db)
):
    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == course_id).first()
    if not policy:
        # Create default policy if none exists
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

    return policy


@router.put("/courses/{course_id}/learning-policy", response_model=LearningPolicyResponse)
def update_learning_policy(
    course_id: int,
    data: LearningPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == course_id).first()

    if not policy:
        policy = LearningPolicy(
            course_id=course_id,
            trainer_id=current_user.id,
            minimum_content_percentage=data.minimum_content_percentage or 90.0,
            minimum_video_watch_percentage=data.minimum_video_watch_percentage or 85.0,
            maximum_skip_percentage=data.maximum_skip_percentage or 15.0,
            allowed_playback_speed=data.allowed_playback_speed or 1.5,
            inactivity_threshold=data.inactivity_threshold or 60,
            require_all_mandatory_modules=data.require_all_mandatory_modules if data.require_all_mandatory_modules is not None else True,
            final_assessment_required=data.final_assessment_required if data.final_assessment_required is not None else True
        )
        db.add(policy)
    else:
        if data.minimum_content_percentage is not None:
            policy.minimum_content_percentage = data.minimum_content_percentage
        if data.minimum_video_watch_percentage is not None:
            policy.minimum_video_watch_percentage = data.minimum_video_watch_percentage
        if data.maximum_skip_percentage is not None:
            policy.maximum_skip_percentage = data.maximum_skip_percentage
        if data.allowed_playback_speed is not None:
            policy.allowed_playback_speed = data.allowed_playback_speed
        if data.inactivity_threshold is not None:
            policy.inactivity_threshold = data.inactivity_threshold
        if data.require_all_mandatory_modules is not None:
            policy.require_all_mandatory_modules = data.require_all_mandatory_modules
        if data.final_assessment_required is not None:
            policy.final_assessment_required = data.final_assessment_required
        policy.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(policy)
    return policy


# ==========================================
# Final Assessment Builder
# ==========================================

@router.get("/courses/{course_id}/assessment")
def get_trainer_assessment(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)

    assessment = db.query(FinalAssessment).filter(FinalAssessment.course_id == course_id).first()
    if not assessment:
        assessment = FinalAssessment(
            course_id=course_id,
            trainer_id=current_user.id,
            title="Final Course Assessment",
            instructions="Complete all questions to certify course mastery. Passing score required.",
            pass_percentage=70.0,
            max_attempts=2,
            time_limit_minutes=30,
            randomize_questions=True,
            randomize_options=True,
            is_published=True
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

    questions = (
        db.query(FinalAssessmentQuestion)
        .filter(FinalAssessmentQuestion.assessment_id == assessment.id)
        .order_by(FinalAssessmentQuestion.order_index.asc())
        .all()
    )

    q_list = []
    for q in questions:
        q_list.append({
            "id": q.id,
            "course_id": q.course_id,
            "assessment_id": q.assessment_id,
            "question": q.question,
            "options": json.loads(q.options_json),
            "correct_answer": q.correct_answer,
            "marks": q.marks,
            "explanation": q.explanation,
            "order_index": q.order_index
        })

    return {
        "assessment": {
            "id": assessment.id,
            "course_id": assessment.course_id,
            "title": assessment.title,
            "instructions": assessment.instructions,
            "pass_percentage": assessment.pass_percentage,
            "max_attempts": assessment.max_attempts,
            "time_limit_minutes": assessment.time_limit_minutes,
            "randomize_questions": assessment.randomize_questions,
            "randomize_options": assessment.randomize_options,
            "is_published": assessment.is_published
        },
        "questions": q_list
    }


@router.put("/courses/{course_id}/assessment/settings")
def update_assessment_settings(
    course_id: int,
    data: AssessmentSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    assessment = db.query(FinalAssessment).filter(FinalAssessment.course_id == course_id).first()
    if not assessment:
        assessment = FinalAssessment(
            course_id=course_id,
            trainer_id=current_user.id
        )
        db.add(assessment)

    if data.title is not None:
        assessment.title = data.title
    if data.instructions is not None:
        assessment.instructions = data.instructions
    if data.pass_percentage is not None:
        assessment.pass_percentage = data.pass_percentage
    if data.max_attempts is not None:
        assessment.max_attempts = data.max_attempts
    if data.time_limit_minutes is not None:
        assessment.time_limit_minutes = data.time_limit_minutes
    if data.randomize_questions is not None:
        assessment.randomize_questions = data.randomize_questions
    if data.randomize_options is not None:
        assessment.randomize_options = data.randomize_options

    assessment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assessment)

    return {"message": "Assessment settings updated successfully", "assessment": assessment}


@router.post("/courses/{course_id}/assessment/questions", response_model=FinalQuestionTrainerResponse)
def add_final_assessment_question(
    course_id: int,
    data: FinalQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    assessment = db.query(FinalAssessment).filter(FinalAssessment.course_id == course_id).first()
    if not assessment:
        assessment = FinalAssessment(
            course_id=course_id,
            trainer_id=current_user.id
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

    count = db.query(FinalAssessmentQuestion).filter(FinalAssessmentQuestion.assessment_id == assessment.id).count()

    question = FinalAssessmentQuestion(
        assessment_id=assessment.id,
        course_id=course_id,
        question=data.question,
        options_json=json.dumps(data.options),
        correct_answer=data.correct_answer,
        marks=data.marks or 1,
        explanation=data.explanation,
        order_index=data.order_index or (count + 1)
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return FinalQuestionTrainerResponse(
        id=question.id,
        course_id=question.course_id,
        assessment_id=question.assessment_id,
        question=question.question,
        options=json.loads(question.options_json),
        correct_answer=question.correct_answer,
        marks=question.marks,
        explanation=question.explanation,
        order_index=question.order_index
    )


@router.put("/assessment/questions/{question_id}", response_model=FinalQuestionTrainerResponse)
def update_final_assessment_question(
    question_id: int,
    data: FinalQuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    q = db.query(FinalAssessmentQuestion).filter(FinalAssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if data.question is not None:
        q.question = data.question
    if data.options is not None:
        q.options_json = json.dumps(data.options)
    if data.correct_answer is not None:
        q.correct_answer = data.correct_answer
    if data.marks is not None:
        q.marks = data.marks
    if data.explanation is not None:
        q.explanation = data.explanation
    if data.order_index is not None:
        q.order_index = data.order_index

    db.commit()
    db.refresh(q)

    return FinalQuestionTrainerResponse(
        id=q.id,
        course_id=q.course_id,
        assessment_id=q.assessment_id,
        question=q.question,
        options=json.loads(q.options_json),
        correct_answer=q.correct_answer,
        marks=q.marks,
        explanation=q.explanation,
        order_index=q.order_index
    )


@router.delete("/assessment/questions/{question_id}")
def delete_final_assessment_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)
    q = db.query(FinalAssessmentQuestion).filter(FinalAssessmentQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(q)
    db.commit()
    return {"message": "Question deleted successfully"}


# ==========================================
# Trainee Factual Progress Analytics
# ==========================================

@router.get("/courses/{course_id}/trainee-progress")
def get_course_trainee_progress(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_trainer_access(current_user)

    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == course_id).first()
    min_content = policy.minimum_content_percentage if policy else 90.0
    min_watch = policy.minimum_video_watch_percentage if policy else 85.0

    total_modules = db.query(CourseModule).filter(CourseModule.course_id == course_id).count()

    trainees = db.query(User).filter(User.role == "trainee").all()
    results = []

    for t in trainees:
        sessions = (
            db.query(LearningSession)
            .filter(LearningSession.user_id == t.id, LearningSession.course_id == course_id)
            .all()
        )
        total_watch = sum(s.watch_time_seconds for s in sessions)
        total_skip = sum(s.skipped_time_seconds for s in sessions)
        max_progress = max([s.progress_pct for s in sessions], default=0.0)

        # Completion record
        completion = (
            db.query(CourseCompletion)
            .filter(CourseCompletion.user_id == t.id, CourseCompletion.course_id == course_id)
            .first()
        )

        # Attempts record
        latest_attempt = (
            db.query(FinalAssessmentAttempt)
            .filter(FinalAssessmentAttempt.user_id == t.id, FinalAssessmentAttempt.course_id == course_id)
            .order_by(FinalAssessmentAttempt.id.desc())
            .first()
        )

        policy_passed = (max_progress >= min_watch) or (completion.learning_policy_passed if completion else False)
        is_completed = completion.final_assessment_passed if completion else False

        results.append({
            "trainee_id": t.id,
            "trainee_name": t.name,
            "trainee_email": t.email,
            "progress_pct": round(max_progress, 1),
            "watch_time_seconds": round(total_watch, 1),
            "skipped_time_seconds": round(total_skip, 1),
            "modules_completed": total_modules if policy_passed else max(1, int(total_modules * (max_progress / 100))),
            "total_modules": total_modules,
            "policy_passed": policy_passed,
            "assessment_score": latest_attempt.percentage if latest_attempt else None,
            "assessment_passed": latest_attempt.passed if latest_attempt else False,
            "course_completed": is_completed,
            "certificate_code": completion.certificate_code if completion else None
        })

    return results


# ==========================================
# Legacy Resources & Analytics (Backward compatibility)
# ==========================================

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
def get_skill_gap_analytics(db: Session = Depends(get_db)):
    topic_gaps = {
        "Python Syntax": {"topic": "Python Syntax", "proficiencyScore": 68, "gapDescription": "Struggles with lambda functions & comprehensions", "recommendedModules": ["Advanced Syntax & Lambda Expressions"]},
        "Concurrency & GIL": {"topic": "Concurrency & GIL", "proficiencyScore": 45, "gapDescription": "Misunderstandings regarding GIL thread lock & asyncio event loops", "recommendedModules": ["Python Concurrency Deep-Dive"]},
        "Memory Management": {"topic": "Memory Management", "proficiencyScore": 58, "gapDescription": "Unclear on reference counting vs cycle collection", "recommendedModules": ["Memory Optimization & Profiling"]}
    }
    return list(topic_gaps.values())
