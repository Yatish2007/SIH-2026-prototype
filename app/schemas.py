from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "trainee"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class CourseResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    duration: str

    model_config = ConfigDict(from_attributes=True)


class QuizQuestionResponse(BaseModel):
    id: int
    course_id: int
    question: str
    options: List[str]
    difficulty: str # easy, moderate, pro
    topic: str


class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: int


class QuizSubmitRequest(BaseModel):
    course_id: int
    self_assessed_level: str # Beginner, Intermediate, Advanced
    answers: List[AnswerSubmission]


class LevelScalingResultResponse(BaseModel):
    attempt_id: int
    course_id: int
    self_level: str
    assessed_level: str
    score: int
    total_questions: int
    percentage: float
    difficulty_scores: Dict[str, Dict[str, Any]]
    knowledge_gaps: List[str]


class PersonalizedPathResponse(BaseModel):
    id: int
    course_id: int
    course_title: str
    assessed_level: str
    title: str
    objective: str
    modules: List[Dict[str, Any]]
    video_title: str
    video_summary: str
    knowledge_gaps: List[str]


class TelemetryEventRequest(BaseModel):
    session_id: int
    event_type: str # seek_skip, pause, focus_lost, progress_update, completed
    progress_pct: float
    details: Optional[str] = None


class TelemetryResponse(BaseModel):
    session_id: int
    status: str # in_progress, completed, incomplete
    progress_pct: float
    message: str


class PostAssessmentRequest(BaseModel):
    course_id: int
    answers: List[AnswerSubmission]


class CertificateResponse(BaseModel):
    id: int
    user_name: str
    course_title: str
    certificate_code: str
    issued_date: datetime
    status: str = "VALID"