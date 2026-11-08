"""PostgreSQL access. Flask is the only app process that talks to this database."""

from __future__ import annotations

import os
from datetime import date, datetime, time
from pathlib import Path
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row

LONDON = ZoneInfo("Europe/London")
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"
REQUIRED_STUDENT_COLUMNS = {"tutor_id", "archived_at", "updated_at"}
REQUIRED_LESSON_COLUMNS = {"tutor_id", "student_id", "date", "start_time", "status"}


def database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


def get_connection():
    return psycopg.connect(database_url(), row_factory=dict_row)


def current_tutor_id(config: dict | None = None) -> str:
    if config:
        configured = str(config.get("TUTOR_ID") or "").strip()
        if configured:
            return configured
    return os.getenv("TUTOR_ID", "tut_local").strip() or "tut_local"


def london_date(value: date | datetime) -> str:
    if isinstance(value, datetime):
        return value.astimezone(LONDON).date().isoformat()
    return value.isoformat()


def format_clock(value: time) -> str:
    return value.strftime("%H:%M")


def table_columns(conn, table: str) -> set[str]:
    rows = conn.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = %s
        """,
        (table,),
    ).fetchall()
    return {row["column_name"] for row in rows}


def assert_schema_compatible(conn) -> None:
    student_cols = table_columns(conn, "students")
    if student_cols and not REQUIRED_STUDENT_COLUMNS <= student_cols:
        raise RuntimeError(
            "The students table exists but is missing tutor_id/archive columns. "
            "On a development database drop table students, then re-run python migrate.py."
        )
    lesson_cols = table_columns(conn, "lessons")
    if lesson_cols and not REQUIRED_LESSON_COLUMNS <= lesson_cols:
        raise RuntimeError(
            "The lessons table exists but does not match this schema. "
            "On a development database drop table lessons, then re-run python migrate.py."
        )


def run_sql_script(conn, sql: str) -> None:
    # Strip full-line comments before splitting. A semicolon in a comment is
    # not a statement delimiter.
    uncommented = "\n".join(
        line for line in sql.splitlines() if not line.strip().startswith("--")
    )
    for raw in uncommented.split(";"):
        statement = raw.strip()
        if statement:
            conn.execute(statement)


def apply_schema(conn) -> None:
    assert_schema_compatible(conn)
    run_sql_script(conn, SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()


def student_json(row: dict) -> dict:
    return {
        "id": row["id"],
        "firstName": row["first_name"],
        "lastName": row["last_name"],
        "yearGroup": row["year_group"],
        "examBoard": row["exam_board"],
        "tier": row["tier"],
        "currentGrade": row["current_grade"],
        "targetGrade": row["target_grade"],
        "learningGoals": row["learning_goals"] or [],
        "nextTopic": row["next_topic"] or "",
        "archived": row["archived_at"] is not None,
        "createdAt": london_date(row["created_at"]),
    }


def lesson_json(row: dict) -> dict:
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "date": row["date"].isoformat() if isinstance(row["date"], date) else str(row["date"]),
        "startTime": format_clock(row["start_time"]) if isinstance(row["start_time"], time) else str(row["start_time"])[:5],
        "durationMinutes": row["duration_minutes"],
        "status": row["status"],
        "topicsCovered": row["topics_covered"] or [],
        "strengths": row["strengths"] or "",
        "difficulties": row["difficulties"] or "",
        "homework": row["homework"] or "",
        "resourceLinks": row["resource_links"] or [],
        "nextLessonPlan": row["next_lesson_plan"] or "",
    }
