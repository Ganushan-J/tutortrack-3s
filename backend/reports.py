"""Deterministic monthly feedback from tutor-owned lesson and progress records."""

from __future__ import annotations

import re
from datetime import date, datetime

from flask import Blueprint, g, jsonify, request

from db import get_connection

bp = Blueprint("reports", __name__)
MAX_REPORT_LENGTH = 50000
REPORT_SELECT = "student_id, month, report_text, updated_at"


def error(message: str, status: int, fields: dict | None = None):
    body = {"error": message}
    if fields:
        body["errors"] = fields
    return jsonify(body), status


def month_bounds(value: str) -> tuple[date, date] | None:
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
        return None
    year, month = map(int, value.split("-"))
    if year < 1 or year > 9998:
        return None
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def unique_notes(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        note = item.strip()
        if note and note.casefold() not in seen:
            seen.add(note.casefold())
            result.append(note)
    return result


def build_monthly_draft(student: dict, lessons: list[dict], observations: list[dict], month: str) -> dict:
    """Use civil dates; ignore cancelled/scheduled lessons and out-of-month records."""
    bounds = month_bounds(month)
    if bounds is None:
        raise ValueError("Invalid calendar month")
    start, end = bounds
    completed = sorted(
        (lesson for lesson in lessons if lesson["status"] == "completed" and start <= lesson["date"] < end),
        key=lambda lesson: (lesson["date"], str(lesson.get("start_time", "")), lesson["id"]),
    )
    dated = sorted(
        (item for item in observations if start <= item["observed_on"] < end),
        key=lambda item: (item["observed_on"], item["id"]),
    )
    topics = unique_notes([
        topic for lesson in completed for topic in (lesson.get("topics_covered") or [])
        if isinstance(topic, str)
    ])
    progress = unique_notes(
        [f'{lesson["date"].isoformat()} — recorded strength: {lesson["strengths"].strip()}'
         for lesson in completed if lesson.get("strengths", "").strip()]
        + [
            f'{item["topic"]} — {item["status"].replace("_", " ")} ({item["observed_on"].isoformat()}): {item["evidence"].strip()}'
            for item in dated
            if item["status"] in {"developing", "independent"} and item.get("evidence", "").strip()
        ]
    )
    revisit = unique_notes(
        [f'{lesson["date"].isoformat()}: {lesson["difficulties"]}' for lesson in completed if lesson.get("difficulties", "").strip()]
        + [
            f'{item["topic"]} — needs support ({item["observed_on"].isoformat()})'
            + (f': {item["evidence"].strip()}' if item.get("evidence", "").strip() else "")
            for item in dated if item["status"] == "needs_support"
        ]
    )
    priorities = unique_notes(
        [item["next_action"] for item in dated if item.get("next_action", "").strip()]
        + [lesson["next_lesson_plan"] for lesson in completed if lesson.get("next_lesson_plan", "").strip()]
    )

    def section(title: str, entries: list[str], empty: str) -> str:
        return title + "\n" + ("\n".join(f"- {entry}" for entry in entries) if entries else empty)

    title = f'{student["first_name"]} {student["last_name"]} — {start.strftime("%B %Y")}'
    text = "\n\n".join([
        f"Monthly feedback — {title}\nCompleted sessions: {len(completed)}",
        section("Topics covered", topics, "No topics recorded in completed lesson notes."),
        section("Evidence of progress", progress, "No dated progress evidence recorded for this month."),
        section("Areas to revisit", revisit, "No difficulties or needs-support observations recorded."),
        section("Next-month priorities", priorities, "No next steps recorded."),
    ])
    return {
        "studentId": student["id"], "month": month,
        "completedSessions": len(completed), "topics": topics,
        "progressEvidence": progress, "areasToRevisit": revisit,
        "nextMonthPriorities": priorities, "text": text,
    }


def saved_json(row: dict) -> dict:
    updated = row["updated_at"]
    return {
        "studentId": row["student_id"],
        "month": row["month"].strftime("%Y-%m"),
        "text": row["report_text"],
        "updatedAt": updated.isoformat() if isinstance(updated, datetime) else str(updated),
    }


def owned_student(conn, student_id: str):
    return conn.execute(
        "SELECT id, first_name, last_name FROM students WHERE id = %s AND tutor_id = %s",
        (student_id, g.tutor_id),
    ).fetchone()


@bp.get("/api/students/<student_id>/reports")
def list_reports(student_id: str):
    with get_connection() as conn:
        if not owned_student(conn, student_id):
            return error("Student not found", 404)
        rows = conn.execute(
            f"SELECT {REPORT_SELECT} FROM monthly_reports WHERE student_id = %s AND tutor_id = %s ORDER BY month DESC",
            (student_id, g.tutor_id),
        ).fetchall()
    return jsonify({"reports": [saved_json(row) for row in rows]})


@bp.get("/api/students/<student_id>/reports/<month>")
def get_report(student_id: str, month: str):
    bounds = month_bounds(month)
    if bounds is None:
        return error("Validation failed", 400, {"month": "Use YYYY-MM"})
    start, end = bounds
    with get_connection() as conn:
        student = owned_student(conn, student_id)
        if not student:
            return error("Student not found", 404)
        lessons = conn.execute(
            "SELECT id, date, start_time, status, topics_covered, strengths, difficulties, next_lesson_plan "
            "FROM lessons WHERE tutor_id = %s AND student_id = %s AND date >= %s AND date < %s",
            (g.tutor_id, student_id, start, end),
        ).fetchall()
        observations = conn.execute(
            "SELECT id, observed_on, topic, status, evidence, next_action FROM topic_observations "
            "WHERE tutor_id = %s AND student_id = %s AND observed_on >= %s AND observed_on < %s",
            (g.tutor_id, student_id, start, end),
        ).fetchall()
        saved = conn.execute(
            f"SELECT {REPORT_SELECT} FROM monthly_reports WHERE tutor_id = %s AND student_id = %s AND month = %s",
            (g.tutor_id, student_id, start),
        ).fetchone()
    return jsonify({
        "draft": build_monthly_draft(student, lessons, observations, month),
        "saved": saved_json(saved) if saved else None,
    })


@bp.put("/api/students/<student_id>/reports/<month>")
def save_report(student_id: str, month: str):
    bounds = month_bounds(month)
    if bounds is None:
        return error("Validation failed", 400, {"month": "Use YYYY-MM"})
    if not request.is_json:
        return error("Send JSON with Content-Type: application/json", 415)
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not isinstance(body.get("text"), str):
        return error("Validation failed", 400, {"text": "Enter report text"})
    text = body["text"].strip()
    if not 1 <= len(text) <= MAX_REPORT_LENGTH:
        return error("Validation failed", 400, {"text": f"Enter 1–{MAX_REPORT_LENGTH} characters"})
    with get_connection() as conn:
        if not owned_student(conn, student_id):
            return error("Student not found", 404)
        row = conn.execute(
            f"INSERT INTO monthly_reports (student_id, tutor_id, month, report_text) "
            f"VALUES (%s, %s, %s, %s) "
            f"ON CONFLICT (student_id, month) DO UPDATE SET report_text = EXCLUDED.report_text, updated_at = now() "
            f"WHERE monthly_reports.tutor_id = EXCLUDED.tutor_id RETURNING {REPORT_SELECT}",
            (student_id, g.tutor_id, bounds[0], text),
        ).fetchone()
        conn.commit()
    return jsonify({"report": saved_json(row)})
