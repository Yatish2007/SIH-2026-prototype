from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="trainee")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    duration: Mapped[str] = mapped_column(String(50), default="4 Hours")
    difficulty: Mapped[str] = mapped_column(String(50), default="Intermediate")
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    learning_objectives: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    trainer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CourseModule(Base):
    __tablename__ = "course_modules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=1)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    module_id: Mapped[int] = mapped_column(ForeignKey("course_modules.id"), nullable=False)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    material_type: Mapped[str] = mapped_column(String(50), nullable=False) # video, document, presentation, note
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LearningPolicy(Base):
    __tablename__ = "learning_policies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), unique=True, nullable=False)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    minimum_content_percentage: Mapped[float] = mapped_column(Float, default=90.0)
    minimum_video_watch_percentage: Mapped[float] = mapped_column(Float, default=85.0)
    maximum_skip_percentage: Mapped[float] = mapped_column(Float, default=15.0)
    allowed_playback_speed: Mapped[float] = mapped_column(Float, default=1.5)
    inactivity_threshold: Mapped[int] = mapped_column(Integer, default=60)
    require_all_mandatory_modules: Mapped[bool] = mapped_column(Boolean, default=True)
    final_assessment_required: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FinalAssessment(Base):
    __tablename__ = "final_assessments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), unique=True, nullable=False)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), default="Final Course Assessment")
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pass_percentage: Mapped[float] = mapped_column(Float, default=70.0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=2)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=30)
    randomize_questions: Mapped[bool] = mapped_column(Boolean, default=True)
    randomize_options: Mapped[bool] = mapped_column(Boolean, default=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FinalAssessmentQuestion(Base):
    __tablename__ = "final_assessment_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("final_assessments.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[str] = mapped_column(Text, nullable=False) # JSON array of options
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False) # Index
    marks: Mapped[int] = mapped_column(Integer, default=1)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FinalAssessmentAttempt(Base):
    __tablename__ = "final_assessment_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("final_assessments.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    answers_json: Mapped[str] = mapped_column(Text, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CourseCompletion(Base):
    __tablename__ = "course_completions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    learning_policy_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    final_assessment_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    final_score: Mapped[float] = mapped_column(Float, default=0.0)
    certificate_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[str] = mapped_column(Text, nullable=False) # JSON array of options
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False) # Index
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False) # easy, moderate, pro
    topic: Mapped[str] = mapped_column(String(100), nullable=False)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    self_assessed_level: Mapped[str] = mapped_column(String(20), nullable=False) # Beginner, Intermediate, Advanced
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    answers_json: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty_scores_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LevelResult(Base):
    __tablename__ = "level_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    quiz_attempt_id: Mapped[int] = mapped_column(ForeignKey("quiz_attempts.id"), nullable=False)
    self_level: Mapped[str] = mapped_column(String(20), nullable=False)
    assessed_level: Mapped[str] = mapped_column(String(20), nullable=False)
    knowledge_gaps_json: Mapped[str] = mapped_column(Text, nullable=False) # JSON array of gaps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PersonalizedPath(Base):
    __tablename__ = "personalized_paths"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    level_result_id: Mapped[int] = mapped_column(ForeignKey("level_results.id"), nullable=False)
    assessed_level: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    modules_json: Mapped[str] = mapped_column(Text, nullable=False) # JSON list of modules & weak topic focus
    video_title: Mapped[str] = mapped_column(String(200), nullable=False)
    video_summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    personalized_path_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personalized_paths.id"), nullable=True)
    module_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    material_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress") # in_progress, completed, incomplete
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)
    watch_time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    skipped_time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    playback_speed: Mapped[float] = mapped_column(Float, default=1.0)
    inactivity_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VideoMonitoringEvent(Base):
    __tablename__ = "video_monitoring_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False) # seek_skip, pause, focus_lost, progress_update, completed, speed_change, inactivity
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    details: Mapped[str] = mapped_column(Text, nullable=True)


class PostAssessment(Base):
    __tablename__ = "post_assessments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    certificate_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    issued_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TrainerResource(Base):
    __tablename__ = "trainer_resources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_url: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)