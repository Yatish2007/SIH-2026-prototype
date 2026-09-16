import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Course, QuizQuestion
from ..schemas import CourseResponse, QuizQuestionResponse

router = APIRouter(
    prefix="/courses",
    tags=["Courses & Pre-Assessments"]
)

# Default seed courses and questions
SEED_COURSES = [
    {
        "id": 1,
        "title": "Python Programming",
        "category": "Software & Development",
        "description": "Master core Python syntax, data structures, OOP, and asynchronous programming.",
        "duration": "6 Hours"
    },
    {
        "id": 2,
        "title": "Web Development & APIs",
        "category": "Fullstack Engineering",
        "description": "Learn HTML, CSS, JavaScript ES6+, RESTful APIs, and modern frontend frameworks.",
        "duration": "8 Hours"
    },
    {
        "id": 3,
        "title": "Industrial SOP & Operational Safety",
        "category": "Industrial Operations",
        "description": "Standard operating procedures, emergency protocols, hazard prevention, and compliance.",
        "duration": "4 Hours"
    }
]

SEED_QUESTIONS = [
    # Course 1: Python Programming
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
    },
    {
        "course_id": 1,
        "question": "What happens when using `asyncio.gather()` with `return_exceptions=True`?",
        "options": [
            "Any exception crashes the entire event loop",
            "Exceptions are returned as items in the result list instead of being raised",
            "All pending tasks are cancelled immediately",
            "Exceptions are ignored and replaced with None"
        ],
        "correct_answer": 1,
        "difficulty": "pro",
        "topic": "Asynchronous Programming"
    },

    # Course 2: Web Development
    {
        "course_id": 2,
        "question": "Which HTML tag is used for the largest heading?",
        "options": ["<h6>", "<head>", "<h1>", "<header>"],
        "correct_answer": 2,
        "difficulty": "easy",
        "topic": "HTML Fundamentals"
    },
    {
        "course_id": 2,
        "question": "What is the difference between `let` and `var` in modern JavaScript?",
        "options": [
            "var is block-scoped, let is function-scoped",
            "let is block-scoped and prevents re-declaration, var is function-scoped",
            "let cannot be updated",
            "There is no functional difference"
        ],
        "correct_answer": 1,
        "difficulty": "moderate",
        "topic": "JavaScript ES6"
    },
    {
        "course_id": 2,
        "question": "What HTTP method should be used for idempotent full entity updates in REST APIs?",
        "options": ["POST", "PUT", "PATCH", "DELETE"],
        "correct_answer": 1,
        "difficulty": "pro",
        "topic": "REST Architecture"
    },

    # Course 3: Industrial SOP
    {
        "course_id": 3,
        "question": "What does PPE stand for in industrial safety?",
        "options": ["Personal Protective Equipment", "Process Performance Evaluation", "Primary Protocol Entry", "Public Protection Engine"],
        "correct_answer": 0,
        "difficulty": "easy",
        "topic": "Safety Equipment"
    },
    {
        "course_id": 3,
        "question": "What is the first step in the Lockout/Tagout (LOTO) safety procedure?",
        "options": ["Apply locks to energy sources", "Notify affected employees and shutdown equipment", "Verify isolation with a multimeter", "Release stored kinetic energy"],
        "correct_answer": 1,
        "difficulty": "moderate",
        "topic": "LOTO Protocols"
    },
    {
        "course_id": 3,
        "question": "In a chemical spill incident of Category 3 hazardous material, what is the mandatory immediate protocol?",
        "options": ["Mop up immediately with water", "Evacuate area, initiate emergency containment, and alert Hazmat response team", "Open windows and continue work", "Store chemical in plastic container"],
        "correct_answer": 1,
        "difficulty": "pro",
        "topic": "Emergency Response"
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
                duration=c_data["duration"]
            )
            db.add(c)
        db.commit()

    # Seed questions if empty
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


@router.get("/{course_id}", response_model=CourseResponse)
def get_course_detail(course_id: int, db: Session = Depends(get_db)):
    seed_database(db)
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    return c


@router.get("/{course_id}/quiz", response_model=List[QuizQuestionResponse])
def get_course_quiz(course_id: int, db: Session = Depends(get_db)):
    seed_database(db)
    questions = db.query(QuizQuestion).filter(QuizQuestion.course_id == course_id).all()
    if not questions:
        # Fallback to course 1 questions if empty for custom course
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
