import os
from sqlalchemy import text
from app.database import engine, SessionLocal
from app.auth import hash_password
from app.models import User, Course, LearningPolicy

MIGRATION_SQL = """
-- 1. Users Table Columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Courses Table Columns
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration VARCHAR(50) DEFAULT '4 Hours';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Intermediate';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Course Modules Columns
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT TRUE;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Course Materials Columns
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS note_content TEXT;
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS duration_seconds FLOAT;
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Learning Policies Columns
ALTER TABLE learning_policies ADD COLUMN IF NOT EXISTS significant_seek_threshold FLOAT DEFAULT 30.0;
ALTER TABLE learning_policies ADD COLUMN IF NOT EXISTS max_significant_seeks INTEGER DEFAULT 5;
ALTER TABLE learning_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. Learning Sessions Columns
ALTER TABLE learning_sessions ALTER COLUMN personalized_path_id DROP NOT NULL;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS module_id INTEGER;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS material_id INTEGER;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS watch_time_seconds FLOAT DEFAULT 0.0;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS skipped_time_seconds FLOAT DEFAULT 0.0;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS playback_speed FLOAT DEFAULT 1.0;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS inactivity_count INTEGER DEFAULT 0;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS consumed_segments_json TEXT;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7. Course Completions Columns
ALTER TABLE course_completions ADD COLUMN IF NOT EXISTS learning_policy_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE course_completions ADD COLUMN IF NOT EXISTS final_assessment_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE course_completions ADD COLUMN IF NOT EXISTS final_score FLOAT DEFAULT 0.0;
ALTER TABLE course_completions ADD COLUMN IF NOT EXISTS certificate_code VARCHAR(50);

-- 8. Fix PostgreSQL Sequence Counters for all tables
SELECT setval(pg_get_serial_sequence('courses', 'id'), COALESCE((SELECT MAX(id) FROM courses), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('course_modules', 'id'), COALESCE((SELECT MAX(id) FROM course_modules), 1));
SELECT setval(pg_get_serial_sequence('course_materials', 'id'), COALESCE((SELECT MAX(id) FROM course_materials), 1));
SELECT setval(pg_get_serial_sequence('learning_policies', 'id'), COALESCE((SELECT MAX(id) FROM learning_policies), 1));
SELECT setval(pg_get_serial_sequence('final_assessments', 'id'), COALESCE((SELECT MAX(id) FROM final_assessments), 1));
SELECT setval(pg_get_serial_sequence('final_assessment_questions', 'id'), COALESCE((SELECT MAX(id) FROM final_assessment_questions), 1));
SELECT setval(pg_get_serial_sequence('quiz_questions', 'id'), COALESCE((SELECT MAX(id) FROM quiz_questions), 1));
"""


def run_migrations():
    """Applies non-destructive schema migrations and seeds standard users."""
    print("Running database migrations...")
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text(MIGRATION_SQL))
    print("Database schema migration completed successfully.")

    # Seed demo users if they don't exist
    db = SessionLocal()
    try:
        demo_accounts = [
            {"email": "trainer_user@capacityconnect.org", "name": "Trainer User", "role": "trainer", "password": "admin"},
            {"email": "trainee_user@capacityconnect.org", "name": "Trainee User", "role": "trainee", "password": "admin"},
            {"email": "admin_user@capacityconnect.org", "name": "Admin User", "role": "admin", "password": "admin"},
        ]

        for acc in demo_accounts:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if not existing:
                new_user = User(
                    name=acc["name"],
                    email=acc["email"],
                    password=hash_password(acc["password"]),
                    role=acc["role"]
                )
                db.add(new_user)
                print(f"Seeded user: {acc['email']} ({acc['role']})")
            else:
                # Never overwrite an account that already exists; the backend
                # account is the source of truth for its identity and role.
                print(f"Demo account already exists, kept as-is: {acc['email']}")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding demo accounts: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run_migrations()
