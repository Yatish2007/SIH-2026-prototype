import json
from datetime import datetime
from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
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
    QuizQuestion,
    User
)
from ..schemas import (
    CourseResponse,
    CourseCreate,
    CourseUpdate,
    CourseDetailResponse,
    ModuleResponse,
    MaterialResponse,
    QuizQuestionResponse,
    FinalAssessmentStatusResponse,
    FinalQuestionTraineeResponse,
    FinalAssessmentSubmitRequest,
    FinalAssessmentAttemptResult
)
from ..services.certificate_generator import generate_certificate
from ..services.completion import (
    evaluate_learning_policy,
    get_or_create_certificate,
    get_certificate_eligibility
)
from .users import get_current_user


router = APIRouter(
    prefix="/courses",
    tags=["Courses & Pre-Assessments"]
)

# Default seed courses
SEED_COURSES = [
    {
        "id": 1,
        "title": "Python Programming",
        "category": "Software & Development",
        "description": "Master core Python syntax, data structures, OOP, and asynchronous programming.",
        "duration": "6 Hours",
        "difficulty": "Intermediate",
        "learning_objectives": "Understand syntax, data structures, asyncio, OOP, and memory management."
    },
    {
        "id": 2,
        "title": "Web Development & APIs",
        "category": "Fullstack Engineering",
        "description": "Learn HTML, CSS, JavaScript ES6+, RESTful APIs, and modern frontend frameworks.",
        "duration": "8 Hours",
        "difficulty": "Beginner",
        "learning_objectives": "Build interactive web frontends and consume REST APIs safely."
    },
    {
        "id": 3,
        "title": "Industrial SOP & Operational Safety",
        "category": "Industrial Operations",
        "description": "Standard operating procedures, emergency protocols, hazard prevention, and compliance.",
        "duration": "4 Hours",
        "difficulty": "Advanced",
        "learning_objectives": "Execute LOTO, hazardous material containment, and PPE compliance."
    }
]

SEED_MODULES = [
    {"course_id": 1, "title": "Module 1: Introduction & Core Syntax", "description": "Variables, expressions, loops, and control flow in Python.", "order_index": 1, "is_mandatory": True},
    {"course_id": 1, "title": "Module 2: Memory Allocation & Data Structures", "description": "Lists, dicts, tuples, reference counting, and garbage collection.", "order_index": 2, "is_mandatory": True},
    {"course_id": 1, "title": "Module 3: Concurrency & Async Programming", "description": "CPython GIL, threading, asyncio event loop, and coroutines.", "order_index": 3, "is_mandatory": True},
    {"course_id": 1, "title": "Module 4: Object-Oriented Architecture", "description": "Classes, inheritance, polymorphism, and design patterns.", "order_index": 4, "is_mandatory": False}
]

SEED_FINAL_QUESTIONS = [
    {
        "course_id": 1,
        "question": "What happens when using `asyncio.gather()` with `return_exceptions=True`?",
        "options": [
            "Any exception crashes the event loop",
            "Exceptions are returned as items in the result list instead of being raised immediately",
            "All pending tasks are automatically cancelled",
            "Exceptions are suppressed and replaced with null values"
        ],
        "correct_answer": 1,
        "marks": 2,
        "explanation": "return_exceptions=True aggregates exceptions directly into the return list for safe inspection."
    },
    {
        "course_id": 1,
        "question": "Which mechanism prevents two native OS threads from executing Python bytecodes concurrently in CPython?",
        "options": [
            "Process Isolation Barrier",
            "Global Interpreter Lock (GIL)",
            "Thread Execution Monitor",
            "Cyclic Memory Semaphore"
        ],
        "correct_answer": 1,
        "marks": 2,
        "explanation": "The GIL is a mutex protecting access to Python objects, preventing thread race conditions in CPython."
    },
    {
        "course_id": 1,
        "question": "In Python memory management, what handles objects involved in circular references?",
        "options": [
            "Simple Reference Counting",
            "Cyclic Garbage Collector (gc module)",
            "OS Memory Paging",
            "Virtual Allocator"
        ],
        "correct_answer": 1,
        "marks": 2,
        "explanation": "Reference counting handles normal deallocation, but cyclic references require the generational gc."
    },
    {
        "course_id": 1,
        "question": "What is the primary operational advantage of Python generators (`yield`) over lists for large datasets?",
        "options": [
            "Generators are compiled to C bytecode faster",
            "Generators compute values lazily on demand without loading the full dataset into memory",
            "Generators allow multithreading without locks",
            "Generators bypass the Python interpreter"
        ],
        "correct_answer": 1,
        "marks": 2,
        "explanation": "Generators produce stream values lazily, achieving O(1) memory complexity."
    },
    {
        "course_id": 1,
        "question": "What will be the output of `[i for i in range(10) if i % 3 == 0]`?",
        "options": [
            "[3, 6, 9]",
            "[0, 3, 6, 9]",
            "[0, 3, 6, 9, 12]",
            "[3, 6]"
        ],
        "correct_answer": 1,
        "marks": 2,
        "explanation": "range(10) starts at 0, and 0 % 3 == 0, giving [0, 3, 6, 9]."
    }
]

SEED_QUESTIONS = [
    # Course 1: Python Programming Pre-assessment
    {
        "course_id": 1,
        "question": "Which keyword is used to define a function in Python?",
        "options": ["func", "def", "function", "lambda"],
        "correct_answer": 1,
        "difficulty": "easy",
        "topic": "Python Syntax"
    },
    {
        "course_id": 1,
        "question": "What is the result of `type([])` in Python?",
        "options": ["<class 'tuple'>", "<class 'list'>", "<class 'array'>", "<class 'dict'>"],
        "correct_answer": 1,
        "difficulty": "easy",
        "topic": "Data Types"
    },
    {
        "course_id": 1,
        "question": "How does a list comprehension `[x**2 for x in range(5) if x % 2 == 0]` evaluate?",
        "options": ["[0, 4, 16]", "[1, 9, 25]", "[0, 1, 4, 9, 16]", "[0, 2, 4]"],
        "correct_answer": 0,
        "difficulty": "moderate",
        "topic": "List Comprehensions"
    },
    {
        "course_id": 1,
        "question": "In Python memory management, what is the purpose of reference counting and garbage collection?",
        "options": ["Speed up CPU execution", "Automatically reclaim unused memory blocks", "Prevent type errors at compile time", "Encrypt memory pointers"],
        "correct_answer": 1,
        "difficulty": "moderate",
        "topic": "Memory Management"
    },
    {
        "course_id": 1,
        "question": "Which of the following describes the GIL (Global Interpreter Lock) in CPython?",
        "options": [
            "A lock preventing memory leaks across processes",
            "A mutex that prevents multiple native threads from executing Python bytecodes at once",
            "A feature that automatically parallelizes nested for-loops",
            "A database connection manager in Python"
        ],
        "correct_answer": 1,
        "difficulty": "pro",
        "topic": "Concurrency & GIL"
    }
]


def seed_database(db: Session):
    # Seed courses if empty
    if db.query(Course).count() == 0:
        for c_data in SEED_COURSES:
            c = Course(
                id=c_data["id"],
                title=c_data["title"],
                category=c_data["category"],
                description=c_data["description"],
                duration=c_data["duration"],
                difficulty=c_data.get("difficulty", "Intermediate"),
                learning_objectives=c_data.get("learning_objectives")
            )
            db.add(c)
        db.commit()

    # Seed modules if empty
    if db.query(CourseModule).count() == 0:
        for m_data in SEED_MODULES:
            m = CourseModule(
                course_id=m_data["course_id"],
                title=m_data["title"],
                description=m_data["description"],
                order_index=m_data["order_index"],
                is_mandatory=m_data["is_mandatory"]
            )
            db.add(m)
        db.commit()

    # Seed learning policy for Course 1 if empty
    if db.query(LearningPolicy).filter(LearningPolicy.course_id == 1).count() == 0:
        p = LearningPolicy(
            course_id=1,
            trainer_id=1,
            minimum_content_percentage=90.0,
            minimum_video_watch_percentage=85.0,
            maximum_skip_percentage=15.0,
            allowed_playback_speed=1.5,
            inactivity_threshold=60,
            require_all_mandatory_modules=True,
            final_assessment_required=True
        )
        db.add(p)
        db.commit()

    # Seed final assessment for Course 1 if empty
    final_assessment = db.query(FinalAssessment).filter(FinalAssessment.course_id == 1).first()
    if not final_assessment:
        final_assessment = FinalAssessment(
            course_id=1,
            trainer_id=1,
            title="Python Fundamentals Final Mastery Assessment",
            instructions="Answer all 5 questions. Score at least 70% to complete course and earn certificate.",
            pass_percentage=70.0,
            max_attempts=2,
            time_limit_minutes=25,
            randomize_questions=True,
            randomize_options=True,
            is_published=True
        )
        db.add(final_assessment)
        db.commit()
        db.refresh(final_assessment)

        for idx, q_data in enumerate(SEED_FINAL_QUESTIONS, start=1):
            fq = FinalAssessmentQuestion(
                assessment_id=final_assessment.id,
                course_id=1,
                question=q_data["question"],
                options_json=json.dumps(q_data["options"]),
                correct_answer=q_data["correct_answer"],
                marks=q_data.get("marks", 2),
                explanation=q_data.get("explanation"),
                order_index=idx
            )
            db.add(fq)
        db.commit()

    # Seed pre-assessment quiz questions if empty
    if db.query(QuizQuestion).count() == 0:
        for q_data in SEED_QUESTIONS:
            q = QuizQuestion(
                course_id=q_data["course_id"],
                question=q_data["question"],
                options_json=json.dumps(q_data["options"]),
                correct_answer=q_data["correct_answer"],
                difficulty=q_data["difficulty"],
                topic=q_data["topic"]
            )
            db.add(q)
        db.commit()


@router.get("/", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    seed_database(db)
    return db.query(Course).all()


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in {"trainer", "admin"}:
        raise HTTPException(status_code=403, detail="Only trainers can create courses")

    course = Course(
        title=data.title,
        category=data.category,
        description=data.description,
        duration=data.duration or "4 Hours",
        difficulty=data.difficulty or "Intermediate",
        thumbnail_url=data.thumbnail_url,
        learning_objectives=data.learning_objectives,
        is_published=True,
        trainer_id=current_user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    # Initialize default learning policy for new course
    policy = LearningPolicy(
        course_id=course.id,
        trainer_id=current_user.id,
        minimum_content_percentage=90.0,
        minimum_video_watch_percentage=85.0,
        maximum_skip_percentage=15.0,
        allowed_playback_speed=1.5,
        inactivity_threshold=60,
        require_all_mandatory_modules=True,
        final_assessment_required=True
    )
    db.add(policy)

    # Initialize final assessment shell
    assessment = FinalAssessment(
        course_id=course.id,
        trainer_id=current_user.id,
        title=f"{course.title} Final Assessment",
        instructions="Complete the final assessment to validate course learning and earn your certificate.",
        pass_percentage=70.0,
        max_attempts=2,
        time_limit_minutes=30
    )
    db.add(assessment)
    db.commit()

    return course


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_course_detail(course_id: int, db: Session = Depends(get_db)):
    seed_database(db)
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")

    modules = (
        db.query(CourseModule)
        .filter(CourseModule.course_id == course_id)
        .order_by(CourseModule.order_index.asc())
        .all()
    )

    module_responses = []
    for m in modules:
        materials = (
            db.query(CourseMaterial)
            .filter(CourseMaterial.module_id == m.id)
            .order_by(CourseMaterial.id.asc())
            .all()
        )
        mat_list = [MaterialResponse.model_validate(mat) for mat in materials]
        module_responses.append(
            ModuleResponse(
                id=m.id,
                course_id=m.course_id,
                title=m.title,
                description=m.description,
                order_index=m.order_index,
                is_mandatory=m.is_mandatory,
                materials=mat_list,
                created_at=m.created_at
            )
        )

    return CourseDetailResponse(
        id=c.id,
        title=c.title,
        category=c.category,
        description=c.description,
        duration=c.duration,
        difficulty=c.difficulty,
        thumbnail_url=c.thumbnail_url,
        learning_objectives=c.learning_objectives,
        is_published=c.is_published,
        trainer_id=c.trainer_id,
        modules=module_responses,
        created_at=c.created_at
    )


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in {"trainer", "admin"}:
        raise HTTPException(status_code=403, detail="Only trainers can update courses")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if data.title is not None:
        course.title = data.title
    if data.category is not None:
        course.category = data.category
    if data.description is not None:
        course.description = data.description
    if data.duration is not None:
        course.duration = data.duration
    if data.difficulty is not None:
        course.difficulty = data.difficulty
    if data.thumbnail_url is not None:
        course.thumbnail_url = data.thumbnail_url
    if data.learning_objectives is not None:
        course.learning_objectives = data.learning_objectives
    if data.is_published is not None:
        course.is_published = data.is_published

    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}/quiz", response_model=List[QuizQuestionResponse])
def get_course_quiz(course_id: int, db: Session = Depends(get_db)):
    seed_database(db)
    questions = db.query(QuizQuestion).filter(QuizQuestion.course_id == course_id).all()

    result = []
    for q in questions:
        result.append(QuizQuestionResponse(
            id=q.id,
            course_id=q.course_id,
            question=q.question,
            options=json.loads(q.options_json),
            difficulty=q.difficulty,
            topic=q.topic
        ))
    return result


def check_learning_policy_compliance(course_id: int, user_id: int, db: Session) -> Tuple[bool, List[str]]:
    result = evaluate_learning_policy(course_id, user_id, db)
    return result["policy_passed"], result["reasons"]


@router.get("/{course_id}/final-assessment", response_model=FinalAssessmentStatusResponse)
def get_final_assessment_status(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    seed_database(db)

    # 1. Fetch course & assessment
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    assessment = db.query(FinalAssessment).filter(FinalAssessment.course_id == course_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Final assessment configuration not found")

    # 2. Fetch questions
    questions = (
        db.query(FinalAssessmentQuestion)
        .filter(FinalAssessmentQuestion.assessment_id == assessment.id)
        .order_by(FinalAssessmentQuestion.order_index.asc())
        .all()
    )

    # 3. Check attempts by this user
    attempts = (
        db.query(FinalAssessmentAttempt)
        .filter(
            FinalAssessmentAttempt.user_id == current_user.id,
            FinalAssessmentAttempt.course_id == course_id
        )
        .order_by(FinalAssessmentAttempt.id.asc())
        .all()
    )
    attempts_used = len(attempts)
    attempts_remaining = max(0, assessment.max_attempts - attempts_used)
    has_passed = any(a.passed for a in attempts)
    best_score = max([a.percentage for a in attempts], default=None)

    # 4. Learning Policy Check (Trainers and admins bypass lock)
    if current_user.role in {"trainer", "admin"}:
        policy_compliant = True
        lock_reasons = []
    else:
        policy_compliant, lock_reasons = check_learning_policy_compliance(course_id, current_user.id, db)

    is_locked = not policy_compliant

    if attempts_used >= assessment.max_attempts and not has_passed:
        is_locked = True
        lock_reasons.append(f"Maximum allowed assessment attempts ({assessment.max_attempts}) reached.")

    total_questions = len(questions)
    total_marks = sum(q.marks for q in questions)

    # 5. Format questions for trainee (options parsed, no answers exposed)
    trainee_questions = []
    if not is_locked or current_user.role in {"trainer", "admin"}:
        for q in questions:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            trainee_questions.append(
                FinalQuestionTraineeResponse(
                    id=q.id,
                    course_id=q.course_id,
                    question=q.question,
                    options=opts,
                    marks=q.marks,
                    order_index=q.order_index
                )
            )

    return FinalAssessmentStatusResponse(
        course_id=course_id,
        title=assessment.title,
        instructions=assessment.instructions,
        is_locked=is_locked,
        lock_reasons=lock_reasons,
        pass_percentage=assessment.pass_percentage,
        max_attempts=assessment.max_attempts,
        attempts_used=attempts_used,
        attempts_remaining=attempts_remaining,
        time_limit_minutes=assessment.time_limit_minutes,
        total_questions=total_questions,
        total_marks=total_marks,
        has_passed=has_passed,
        best_score=best_score,
        questions=trainee_questions
    )


@router.post("/{course_id}/final-assessment/submit", response_model=FinalAssessmentAttemptResult)
def submit_final_assessment(
    course_id: int,
    data: FinalAssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    assessment = db.query(FinalAssessment).filter(FinalAssessment.course_id == course_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Final assessment not found")

    # Enforce trainer-defined learning policy BEFORE an attempt begins.
    # The backend, not the frontend, decides whether the assessment is unlocked.
    policy_compliant, policy_reasons = check_learning_policy_compliance(course_id, current_user.id, db)
    if current_user.role not in {"trainer", "admin"} and not policy_compliant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Final assessment is locked until learning requirements are met.", "lock_reasons": policy_reasons}
        )

    # Check remaining attempts
    previous_attempts = (
        db.query(FinalAssessmentAttempt)
        .filter(
            FinalAssessmentAttempt.user_id == current_user.id,
            FinalAssessmentAttempt.course_id == course_id
        )
        .all()
    )
    attempt_num = len(previous_attempts) + 1
    if len(previous_attempts) >= assessment.max_attempts:
        raise HTTPException(status_code=400, detail=f"Maximum attempts ({assessment.max_attempts}) reached.")

    questions = (
        db.query(FinalAssessmentQuestion)
        .filter(FinalAssessmentQuestion.assessment_id == assessment.id)
        .all()
    )
    if not questions:
        raise HTTPException(status_code=400, detail="No final assessment questions configured for this course.")

    total_marks = sum(q.marks for q in questions) if questions else 1
    earned_score = 0

    # Grade submitted answers
    for q in questions:
        trainee_ans = data.answers.get(q.id)
        if trainee_ans is None and str(q.id) in data.answers:
            trainee_ans = data.answers.get(str(q.id))
        if trainee_ans is not None and trainee_ans == q.correct_answer:
            earned_score += q.marks

    percentage = round((earned_score / total_marks) * 100.0, 1) if total_marks > 0 else 0.0
    passed = percentage >= assessment.pass_percentage
    remaining_attempts = max(0, assessment.max_attempts - attempt_num)

    attempt = FinalAssessmentAttempt(
        user_id=current_user.id,
        course_id=course_id,
        assessment_id=assessment.id,
        score=earned_score,
        total_marks=total_marks,
        percentage=percentage,
        passed=passed,
        answers_json=json.dumps(data.answers),
        attempt_number=attempt_num,
        started_at=datetime.utcnow(),
        submitted_at=datetime.utcnow()
    )
    db.add(attempt)

    cert_code = None
    if passed:
        # Record the objective assessment result. This is only ever one
        # component of completion - the learning policy is never auto-marked
        # as passed just because an assessment was passed.
        comp = (
            db.query(CourseCompletion)
            .filter(
                CourseCompletion.user_id == current_user.id,
                CourseCompletion.course_id == course_id
            )
            .first()
        )
        if not comp:
            comp = CourseCompletion(
                user_id=current_user.id,
                course_id=course_id,
                learning_policy_passed=policy_compliant,
                final_assessment_passed=True,
                final_score=percentage,
                completed_at=datetime.utcnow()
            )
            db.add(comp)
        else:
            comp.final_assessment_passed = True
            comp.final_score = max(comp.final_score, percentage)

        db.flush()

        # Certificate issuance is entirely backend-controlled and gated on
        # BOTH the learning policy AND the final assessment result.
        eligible, eligibility_reasons = get_certificate_eligibility(course_id, current_user.id, db)
        if eligible:
            cert = get_or_create_certificate(
                course_id,
                current_user.id,
                db,
                course_title=course.title,
                score=percentage
            )
            if cert:
                cert_code = cert.certificate_code

            if generate_certificate and cert_code:
                try:
                    generate_certificate({
                        "name": current_user.name,
                        "course": course.title,
                        "score": int(percentage),
                        "completion_date": datetime.utcnow().strftime("%Y-%m-%d"),
                        "certificate_id": cert_code
                    })
                except Exception as e:
                    print("Certificate Generator notice:", e)

    db.commit()
    db.refresh(attempt)

    msg = (
        f"Congratulations! You passed with {percentage}%."
        if passed
        else f"Assessment score: {percentage}%. Required to pass: {assessment.pass_percentage}%."
    )

    return FinalAssessmentAttemptResult(
        attempt_id=attempt.id,
        course_id=course_id,
        score=earned_score,
        total_marks=total_marks,
        percentage=percentage,
        passed=passed,
        pass_percentage=assessment.pass_percentage,
        attempt_number=attempt_num,
        attempts_remaining=remaining_attempts,
        certificate_code=cert_code,
        message=msg
    )

