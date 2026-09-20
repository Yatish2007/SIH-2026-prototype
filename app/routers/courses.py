import json
from typing import List, Optional
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
    QuizQuestionResponse
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
    if not questions:
        questions = db.query(QuizQuestion).filter(QuizQuestion.course_id == 1).all()

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
