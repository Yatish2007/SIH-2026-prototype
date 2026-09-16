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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
    personalized_path_id: Mapped[int] = mapped_column(ForeignKey("personalized_paths.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress") # in_progress, completed, incomplete
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VideoMonitoringEvent(Base):
    __tablename__ = "video_monitoring_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False) # seek_skip, pause, focus_lost, progress_update, completed
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