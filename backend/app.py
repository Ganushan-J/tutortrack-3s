"""TutorTrack JSON API. Only this process talks to PostgreSQL."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from psycopg.types.json import Json

from db import (
    current_tutor_id,
    get_connection,
    lesson_json,
    student_json,
)
from validation import validate_lesson, validate_student

load_dotenv(Path(__file__).resolve().parent / ".env")

STUDENT_COLUMNS = {
    "first_name": "first_name",
    "last_name": "last_name",
    "year_group": "year_group",
    "exam_board": "exam_board",
    "tier": "tier",
    "current_grade": "current_grade",
    "target_grade": "target_grade",
    "learning_goals": "learning_goals",
    "next_topic": "next_topic",
}
LESSON_COLUMNS = {
    "student_id": "student_id",
    "date": "date",
    "start_time": "start_time",
    "duration_minutes": "duration_minutes",
    "status": "status",
    "topics_covered": "topics_covered",
    "strengths": "strengths",
    "difficulties": "difficulties",
    "homework": "homework",
    "resource_links": "resource_links",
    "next_lesson_plan": "next_lesson_plan",
}
JSON_FIELDS = {"learning_goals", "topics_covered", "resource_links"}
STUDENT_SELECT = """
    id, first_name, last_name, year_group, exam_board, tier,
    current_grade, target_grade, learning_goals, next_topic,
    archived_at, created_at
"""
LESSON_SELECT = """
    id, student_id, date, start_time, duration_minutes, status,
    topics_covered, strengths, difficulties, homework, resource_links,
    next_lesson_plan
"""


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config["TUTOR_ID"] = current_tutor_id(test_config)
    if test_config:
        app.config.update(test_config)

    CORS(
        app,
        origins=[
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ],
    )

    @app.errorhandler(RuntimeError)
    def handle_config_error(error):
        return jsonify({"error": str(error)}), 503

    @app.errorhandler(psycopg.Error)
    def handle_db_error(_error):
        return jsonify(
            {
                "error": "Could not talk to the database. Check DATABASE_URL and run python migrate.py.",
            }
        ), 503

    def tutor_id() -> str:
        return app.config["TUTOR_ID"]

    def json_error(message: str, status: int, errors: dict | None = None):
        payload = {"error": message}
        if errors:
            payload["errors"] = errors
        return jsonify(payload), status

    def require_json():
        if not request.is_json:
            return json_error("Send JSON with Content-Type: application/json", 415)
        return None

    def bind(value, field: str):
        return Json(value) if field in JSON_FIELDS else value

    def fetch_owned_student(conn, student_id: str):
        return conn.execute(
            f"SELECT {STUDENT_SELECT} FROM students WHERE id = %s AND tutor_id = %s",
            (student_id, tutor_id()),
        ).fetchone()

    def fetch_owned_lesson(conn, lesson_id: str):
        return conn.execute(
            f"SELECT {LESSON_SELECT} FROM lessons WHERE id = %s AND tutor_id = %s",
            (lesson_id, tutor_id()),
        ).fetchone()

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.get("/api/students")
    def list_students():
        include_archived = request.args.get("includeArchived", "").lower() in {"1", "true", "yes"}
        sql = f"SELECT {STUDENT_SELECT} FROM students WHERE tutor_id = %s"
        params: list = [tutor_id()]
        if not include_archived:
            sql += " AND archived_at IS NULL"
        sql += " ORDER BY last_name, first_name"
        with get_connection() as conn:
            rows = conn.execute(sql, params).fetchall()
        return jsonify({"students": [student_json(row) for row in rows]})

    @app.post("/api/students")
    def create_student():
        problem = require_json()
        if problem:
            return problem
        payload, errors = validate_student(request.get_json(silent=True))
        if errors:
            return json_error("Validation failed", 400, errors)

        student_id = f"stu_{uuid.uuid4().hex[:12]}"
        with get_connection() as conn:
            row = conn.execute(
                f"""
                INSERT INTO students (
                    id, tutor_id, first_name, last_name, year_group, exam_board, tier,
                    current_grade, target_grade, learning_goals, next_topic
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING {STUDENT_SELECT}
                """,
                (
                    student_id,
                    tutor_id(),
                    payload["first_name"],
                    payload["last_name"],
                    payload["year_group"],
                    payload["exam_board"],
                    payload["tier"],
                    payload["current_grade"],
                    payload["target_grade"],
                    Json(payload["learning_goals"]),
                    payload["next_topic"],
                ),
            ).fetchone()
            conn.commit()
        return jsonify({"student": student_json(row)}), 201

    @app.get("/api/students/<student_id>")
    def get_student(student_id: str):
        with get_connection() as conn:
            row = fetch_owned_student(conn, student_id)
        if not row:
            return json_error("Student not found", 404)
        return jsonify({"student": student_json(row)})

    @app.patch("/api/students/<student_id>")
    def update_student(student_id: str):
        problem = require_json()
        if problem:
            return problem
        payload, errors = validate_student(request.get_json(silent=True), partial=True)
        if errors:
            return json_error("Validation failed", 400, errors)

        assignments = []
        values = []
        for key, column in STUDENT_COLUMNS.items():
            if key in payload:
                assignments.append(f"{column} = %s")
                values.append(bind(payload[key], key))
        assignments.append("updated_at = now()")

        with get_connection() as conn:
            existing = fetch_owned_student(conn, student_id)
            if not existing:
                return json_error("Student not found", 404)
            merged = {
                "tier": payload.get("tier", existing["tier"]),
                "current_grade": payload.get("current_grade", existing["current_grade"]),
                "target_grade": payload.get("target_grade", existing["target_grade"]),
            }
            if merged["tier"] == "Foundation":
                grade_errors = {}
                if merged["current_grade"] > 5:
                    grade_errors["currentGrade"] = "Foundation tier caps at grade 5"
                if merged["target_grade"] > 5:
                    grade_errors["targetGrade"] = "Foundation tier caps at grade 5"
                if grade_errors:
                    return json_error("Validation failed", 400, grade_errors)
            values.extend([student_id, tutor_id()])
            row = conn.execute(
                f"""
                UPDATE students
                SET {", ".join(assignments)}
                WHERE id = %s AND tutor_id = %s
                RETURNING {STUDENT_SELECT}
                """,
                values,
            ).fetchone()
            conn.commit()
        return jsonify({"student": student_json(row)})

    @app.post("/api/students/<student_id>/archive")
    def archive_student(student_id: str):
        with get_connection() as conn:
            row = fetch_owned_student(conn, student_id)
            if not row:
                return json_error("Student not found", 404)
            row = conn.execute(
                f"""
                UPDATE students
                SET archived_at = COALESCE(archived_at, now()), updated_at = now()
                WHERE id = %s AND tutor_id = %s
                RETURNING {STUDENT_SELECT}
                """,
                (student_id, tutor_id()),
            ).fetchone()
            conn.commit()
        return jsonify({"student": student_json(row)})

    @app.post("/api/students/<student_id>/restore")
    def restore_student(student_id: str):
        with get_connection() as conn:
            row = fetch_owned_student(conn, student_id)
            if not row:
                return json_error("Student not found", 404)
            row = conn.execute(
                f"""
                UPDATE students
                SET archived_at = NULL, updated_at = now()
                WHERE id = %s AND tutor_id = %s
                RETURNING {STUDENT_SELECT}
                """,
                (student_id, tutor_id()),
            ).fetchone()
            conn.commit()
        return jsonify({"student": student_json(row)})

    @app.get("/api/lessons")
    def list_lessons():
        sql = f"SELECT {LESSON_SELECT} FROM lessons WHERE tutor_id = %s"
        params: list = [tutor_id()]
        student_id = request.args.get("studentId", "").strip()
        status = request.args.get("status", "").strip()
        on_date = request.args.get("date", "").strip()
        if student_id:
            sql += " AND student_id = %s"
            params.append(student_id)
        if status:
            sql += " AND status = %s"
            params.append(status)
        if on_date:
            sql += " AND date = %s"
            params.append(on_date)
        sql += " ORDER BY date, start_time"
        with get_connection() as conn:
            rows = conn.execute(sql, params).fetchall()
        return jsonify({"lessons": [lesson_json(row) for row in rows]})

    @app.post("/api/lessons")
    def create_lesson():
        problem = require_json()
        if problem:
            return problem
        payload, errors = validate_lesson(request.get_json(silent=True))
        if errors:
            return json_error("Validation failed", 400, errors)

        lesson_id = f"les_{uuid.uuid4().hex[:12]}"
        with get_connection() as conn:
            student = fetch_owned_student(conn, payload["student_id"])
            if not student:
                return json_error("Validation failed", 400, {"studentId": "Student not found"})
            if student["archived_at"] is not None:
                return json_error("Validation failed", 400, {"studentId": "Archived students cannot be scheduled"})
            row = conn.execute(
                f"""
                INSERT INTO lessons (
                    id, tutor_id, student_id, date, start_time, duration_minutes, status,
                    topics_covered, strengths, difficulties, homework, resource_links,
                    next_lesson_plan
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING {LESSON_SELECT}
                """,
                (
                    lesson_id,
                    tutor_id(),
                    payload["student_id"],
                    payload["date"],
                    payload["start_time"],
                    payload["duration_minutes"],
                    payload["status"],
                    Json(payload["topics_covered"]),
                    payload["strengths"],
                    payload["difficulties"],
                    payload["homework"],
                    Json(payload["resource_links"]),
                    payload["next_lesson_plan"],
                ),
            ).fetchone()
            conn.commit()
        return jsonify({"lesson": lesson_json(row)}), 201

    @app.get("/api/lessons/<lesson_id>")
    def get_lesson(lesson_id: str):
        with get_connection() as conn:
            row = fetch_owned_lesson(conn, lesson_id)
        if not row:
            return json_error("Lesson not found", 404)
        return jsonify({"lesson": lesson_json(row)})

    @app.patch("/api/lessons/<lesson_id>")
    def update_lesson(lesson_id: str):
        problem = require_json()
        if problem:
            return problem
        payload, errors = validate_lesson(request.get_json(silent=True), partial=True)
        if errors:
            return json_error("Validation failed", 400, errors)

        assignments = []
        values = []
        for key, column in LESSON_COLUMNS.items():
            if key in payload:
                assignments.append(f"{column} = %s")
                values.append(bind(payload[key], key))
        assignments.append("updated_at = now()")

        with get_connection() as conn:
            existing = fetch_owned_lesson(conn, lesson_id)
            if not existing:
                return json_error("Lesson not found", 404)
            if "student_id" in payload:
                student = fetch_owned_student(conn, payload["student_id"])
                if not student:
                    return json_error("Validation failed", 400, {"studentId": "Student not found"})
                if student["archived_at"] is not None:
                    return json_error(
                        "Validation failed",
                        400,
                        {"studentId": "Archived students cannot be scheduled"},
                    )
            values.extend([lesson_id, tutor_id()])
            row = conn.execute(
                f"""
                UPDATE lessons
                SET {", ".join(assignments)}
                WHERE id = %s AND tutor_id = %s
                RETURNING {LESSON_SELECT}
                """,
                values,
            ).fetchone()
            conn.commit()
        return jsonify({"lesson": lesson_json(row)})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "1") == "1",
    )
