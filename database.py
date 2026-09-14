import sqlite3
from datetime import date

DATABASE = "certificate.db"


def init_database():
    conn = sqlite3.connect(DATABASE)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            course TEXT NOT NULL,
            score INTEGER NOT NULL,
            completed INTEGER DEFAULT 0,
            completion_date TEXT,
            certificate_id TEXT
        )
    """)

    # Add test student if database is empty
    count = conn.execute(
        "SELECT COUNT(*) FROM students"
    ).fetchone()[0]

    if count == 0:
        conn.execute("""
            INSERT INTO students
            (name, course, score, completed, completion_date, certificate_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "Yatish",
            "Python Programming",
            91,
            1,
            date.today().strftime("%d/%m/%Y"),
            "CERT-001"
        ))

    conn.commit()
    conn.close()


def get_student(student_id):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    student = conn.execute(
        "SELECT * FROM students WHERE id = ?",
        (student_id,)
    ).fetchone()

    conn.close()

    return student