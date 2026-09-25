from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ==========================================
# Authentication & Users
# ==========================================

class UserRegister(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    password: str
    role: str = "trainee"

    @model_validator(mode="after")
    def _validate(self):
        # Accept either `name` or `full_name` so existing clients that post
        # the documented `full_name` field keep working.
        self.name = (self.name or self.full_name or "").strip()
        if not self.name:
            raise ValueError("Full name is required")

        self.email = (self.email or "").strip().lower()
        if not EMAIL_RE.match(self.email):
            raise ValueError("Invalid email address")

        if not self.password or len(self.password) < 6:
            raise ValueError("Password must be at least 6 characters")

        self.role = (self.role or "trainee").strip().lower()
        return self


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


# ==========================================
# Course & Modules
# ==========================================

class CourseCreate(BaseModel):
    title: str
    category: str
    description: str
    duration: Optional[str] = "4 Hours"
    difficulty: Optional[str] = "Intermediate"
    thumbnail_url: Optional[str] = None
    learning_objectives: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[str] = None
    thumbnail_url: Optional[str] = None
    learning_objectives: Optional[str] = None
    is_published: Optional[bool] = None


class CourseResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    duration: str
    difficulty: Optional[str] = "Intermediate"
    thumbnail_url: Optional[str] = None
    learning_objectives: Optional[str] = None
    is_published: Optional[bool] = True
    trainer_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 1
    is_mandatory: Optional[bool] = True


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_mandatory: Optional[bool] = None


class MaterialResponse(BaseModel):
    id: int
    course_id: int
    module_id: int
    trainer_id: int
    title: str
    description: Optional[str] = None
    material_type: str # video, document, presentation, note
    file_name: str
    file_path: str
    file_url: str
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    duration_seconds: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModuleResponse(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str] = None
    order_index: int
    is_mandatory: bool
    materials: List[MaterialResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseDetailResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    duration: str
    difficulty: str
    thumbnail_url: Optional[str] = None
    learning_objectives: Optional[str] = None
    is_published: bool
    trainer_id: Optional[int] = None
    modules: List[ModuleResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Learning Policy
# ==========================================

class LearningPolicyCreate(BaseModel):
    minimum_content_percentage: Optional[float] = 90.0
    minimum_video_watch_percentage: Optional[float] = 85.0
    maximum_skip_percentage: Optional[float] = 15.0
    allowed_playback_speed: Optional[float] = 1.5
    inactivity_threshold: Optional[int] = 60
    require_all_mandatory_modules: Optional[bool] = True
    final_assessment_required: Optional[bool] = True


class LearningPolicyResponse(BaseModel):
    id: int
    course_id: int
    trainer_id: int
    minimum_content_percentage: float
    minimum_video_watch_percentage: float
    maximum_skip_percentage: float
    allowed_playback_speed: float
    inactivity_threshold: int
    require_all_mandatory_modules: bool
    final_assessment_required: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyValidationStatus(BaseModel):
    course_id: int
    user_id: int
    is_unlocked: bool
    policy_passed: bool
    content_consumption_pct: float
    video_watch_pct: float
    skip_pct: float
    mandatory_modules_completed: int
    mandatory_modules_total: int
    inactivity_violations: int
    reasons: List[str]
    policy_rules: Dict[str, Any]


# ==========================================
# Final Assessment & Questions
# ==========================================

class AssessmentSettingsUpdate(BaseModel):
    title: Optional[str] = None
    instructions: Optional[str] = None
    pass_percentage: Optional[float] = 70.0
    max_attempts: Optional[int] = 2
    time_limit_minutes: Optional[int] = 30
    randomize_questions: Optional[bool] = True
    randomize_options: Optional[bool] = True


class FinalQuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_answer: int # 0 to 3
    marks: Optional[int] = 1
    explanation: Optional[str] = None
    order_index: Optional[int] = 1


class FinalQuestionUpdate(BaseModel):
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[int] = None
    marks: Optional[int] = None
    explanation: Optional[str] = None
    order_index: Optional[int] = None


# Returned to Trainer (includes correct answer)
class FinalQuestionTrainerResponse(BaseModel):
    id: int
    course_id: int
    assessment_id: int
    question: str
    options: List[str]
    correct_answer: int
    marks: int
    explanation: Optional[str] = None
    order_index: int

    model_config = ConfigDict(from_attributes=True)


# Returned to Trainee (OMITS correct answer)
class FinalQuestionTraineeResponse(BaseModel):
    id: int
    course_id: int
    question: str
    options: List[str]
    marks: int
    order_index: int


class FinalAssessmentStatusResponse(BaseModel):
    course_id: int
    title: str
    instructions: Optional[str] = None
    is_locked: bool
    lock_reasons: List[str] = []
    pass_percentage: float
    max_attempts: int
    attempts_used: int
    attempts_remaining: int
    time_limit_minutes: int
    total_questions: int
    total_marks: int
    has_passed: bool = False
    best_score: Optional[float] = None
    questions: Optional[List[FinalQuestionTraineeResponse]] = None


class FinalAssessmentSubmitRequest(BaseModel):
    answers: Dict[int, int] # question_id -> selected_option_index


class FinalAssessmentAttemptResult(BaseModel):
    attempt_id: int
    course_id: int
    score: int
    total_marks: int
    percentage: float
    passed: bool
    pass_percentage: float
    attempt_number: int
    attempts_remaining: int
    certificate_code: Optional[str] = None
    message: str


# ==========================================
# Telemetry & Learning Sessions
# ==========================================

class SessionStartRequest(BaseModel):
    course_id: int
    module_id: Optional[int] = None
    material_id: Optional[int] = None


class SessionStartResponse(BaseModel):
    session_id: int
    course_id: int
    status: str
    progress_pct: float
    message: str


class TelemetryEventRequest(BaseModel):
    session_id: int
    event_type: str # seek_skip, pause, play, focus_lost, progress_update, speed_change, inactivity, completed
    progress_pct: float
    watch_time_seconds: Optional[float] = 0.0
    skipped_time_seconds: Optional[float] = 0.0
    playback_speed: Optional[float] = 1.0
    details: Optional[str] = None


class TelemetryResponse(BaseModel):
    session_id: int
    status: str # in_progress, completed, incomplete
    progress_pct: float
    message: str
    policy_compliant: bool = True
    alert: Optional[str] = None


# ==========================================
# Pre-Assessment & Level Scaling (Existing)
# ==========================================

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


# ==========================================
# Course Completion & Certificates
# ==========================================

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