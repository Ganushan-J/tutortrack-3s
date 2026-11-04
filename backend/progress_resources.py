"""Dated topic observations and a reusable, tutor-owned resource catalog."""

from __future__ import annotations

import uuid
from datetime import datetime
from urllib.parse import urlsplit

from flask import Blueprint, g, jsonify, request

from db import get_connection

bp = Blueprint("progress_resources", __name__)
STATUSES = {"needs_support", "developing", "independent"}
TIERS = {"Foundation", "Higher", "Both"}

OBSERVATION_SELECT = "id, student_id, lesson_id, topic, status, observed_on, evidence, next_action, created_at"
RESOURCE_SELECT = "id, title, url, topic, tier, created_at"


def error(message: str, status: int, fields: dict | None = None):
    body = {"error": message}
    if fields:
        body["errors"] = fields
    return jsonify(body), status


def json_body():
    if not request.is_json:
        return None, error("Send JSON with Content-Type: application/json", 415)
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return None, error("Validation failed", 400, {"body": "Request must be a JSON object"})
    return body, None


def text_field(body: dict, name: str, max_length: int, errors: dict, *, required: bool = False):
    value = body.get(name)
    if not isinstance(value, str):
        errors[name] = "Must be text"
        return ""
    value = value.strip()
    if (required and not value) or len(value) > max_length:
        errors[name] = f"Must be {'1–' if required else 'at most '}{max_length} characters"
    return value


def validate_observation(body: dict, *, partial: bool = False):
    errors: dict[str, str] = {}
    data = {}
    if partial and not body:
        return None, {"body": "Send at least one field to update"}
    if not partial or "topic" in body:
        data["topic"] = text_field(body, "topic", 120, errors, required=True)
    if not partial or "status" in body:
        if body.get("status") not in STATUSES:
            errors["status"] = "Choose needs support, developing or independent"
        else:
            data["status"] = body["status"]
    if not partial or "observedOn" in body:
        raw = body.get("observedOn")
        try:
            if not isinstance(raw, str) or len(raw) != 10:
                raise ValueError
            data["observed_on"] = datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            errors["observedOn"] = "Date must be YYYY-MM-DD"
    for external, column in (("evidence", "evidence"), ("nextAction", "next_action")):
        if not partial or external in body:
            if body.get(external, "") is None:
                errors[external] = "Must be text"
            else:
                data[column] = text_field({external: body.get(external, "")}, external, 2000, errors)
    if "lessonId" in body:
        lesson_id = body["lessonId"]
        if lesson_id is not None and (not isinstance(lesson_id, str) or not lesson_id.startswith("les_") or len(lesson_id) > 64):
            errors["lessonId"] = "Choose a valid lesson"
        else:
            data["lesson_id"] = lesson_id
    return (None, errors) if errors else (data, {})


def validate_resource(body: dict, *, partial: bool = False):
    errors: dict[str, str] = {}
    data = {}
    if partial and not body:
        return None, {"body": "Send at least one field to update"}
    for external, column, limit in (("title", "title", 160), ("topic", "topic", 120)):
        if not partial or external in body:
            data[column] = text_field(body, external, limit, errors, required=True)
    if not partial or "url" in body:
        url = text_field(body, "url", 500, errors, required=True)
        try:
            parsed = urlsplit(url)
            _ = parsed.port  # Raises ValueError for a malformed port.
            if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password or any(char.isspace() or ord(char) < 32 for char in url):
                raise ValueError
        except ValueError:
            errors["url"] = "Enter a valid http:// or https:// URL"
        data["url"] = url
    if not partial or "tier" in body:
        if body.get("tier") not in TIERS:
            errors["tier"] = "Choose Foundation, Higher or Both"
        else:
            data["tier"] = body["tier"]
    return (None, errors) if errors else (data, {})


def observation_json(row):
    return {
        "id": row["id"], "studentId": row["student_id"], "lessonId": row["lesson_id"],
        "topic": row["topic"], "status": row["status"],
        "observedOn": row["observed_on"].isoformat(),
        "evidence": row["evidence"], "nextAction": row["next_action"],
    }


def resource_json(row):
    return {
        "id": row["id"], "title": row["title"], "url": row["url"],
        "topic": row["topic"], "tier": row["tier"],
        "createdAt": row["created_at"].date().isoformat(),
    }


def owned_student(conn, student_id):
    return conn.execute(
        "SELECT id FROM students WHERE id = %s AND tutor_id = %s",
        (student_id, g.tutor_id),
    ).fetchone()


def lesson_belongs_to_student(conn, lesson_id, student_id):
    if lesson_id is None:
        return True
    return bool(conn.execute(
        "SELECT 1 FROM lessons WHERE id = %s AND student_id = %s AND tutor_id = %s",
        (lesson_id, student_id, g.tutor_id),
    ).fetchone())


@bp.get("/api/students/<student_id>/progress")
def list_progress(student_id):
    with get_connection() as conn:
        if not owned_student(conn, student_id):
            return error("Student not found", 404)
        rows = conn.execute(
            f"SELECT {OBSERVATION_SELECT} FROM topic_observations WHERE student_id = %s AND tutor_id = %s ORDER BY observed_on DESC, created_at DESC, id DESC",
            (student_id, g.tutor_id),
        ).fetchall()
    return jsonify({"observations": [observation_json(row) for row in rows]})


@bp.post("/api/students/<student_id>/progress")
def create_progress(student_id):
    body, problem = json_body()
    if problem:
        return problem
    data, errors = validate_observation(body)
    if errors:
        return error("Validation failed", 400, errors)
    with get_connection() as conn:
        if not owned_student(conn, student_id):
            return error("Student not found", 404)
        if not lesson_belongs_to_student(conn, data.get("lesson_id"), student_id):
            return error("Validation failed", 400, {"lessonId": "Lesson not found for this student"})
        row = conn.execute(
            f"INSERT INTO topic_observations (id, tutor_id, student_id, lesson_id, topic, status, observed_on, evidence, next_action) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING {OBSERVATION_SELECT}",
            (f"obs_{uuid.uuid4().hex[:12]}", g.tutor_id, student_id, data.get("lesson_id"), data["topic"], data["status"], data["observed_on"], data["evidence"], data["next_action"]),
        ).fetchone()
        conn.commit()
    return jsonify({"observation": observation_json(row)}), 201


@bp.patch("/api/progress/<observation_id>")
def update_progress(observation_id):
    body, problem = json_body()
    if problem:
        return problem
    data, errors = validate_observation(body, partial=True)
    if errors:
        return error("Validation failed", 400, errors)
    with get_connection() as conn:
        current = conn.execute(
            "SELECT student_id FROM topic_observations WHERE id = %s AND tutor_id = %s",
            (observation_id, g.tutor_id),
        ).fetchone()
        if not current:
            return error("Observation not found", 404)
        if "lesson_id" in data and not lesson_belongs_to_student(conn, data["lesson_id"], current["student_id"]):
            return error("Validation failed", 400, {"lessonId": "Lesson not found for this student"})
        columns = ("lesson_id", "topic", "status", "observed_on", "evidence", "next_action")
        assignments = [f"{key} = %s" for key in columns if key in data]
        values = [data[key] for key in columns if key in data]
        if not assignments:
            return error("Validation failed", 400, {"body": "No editable fields supplied"})
        row = conn.execute(
            f"UPDATE topic_observations SET {', '.join(assignments)}, updated_at = now() WHERE id = %s AND tutor_id = %s RETURNING {OBSERVATION_SELECT}",
            [*values, observation_id, g.tutor_id],
        ).fetchone()
        conn.commit()
    return jsonify({"observation": observation_json(row)})


@bp.get("/api/resources")
def list_resources():
    query = request.args.get("q", "").strip()[:120]
    tier = request.args.get("tier", "").strip()
    sql = f"SELECT {RESOURCE_SELECT} FROM resources WHERE tutor_id = %s"
    params = [g.tutor_id]
    if query:
        sql += " AND (title ILIKE %s OR topic ILIKE %s)"
        params.extend([f"%{query}%", f"%{query}%"])
    if tier in {"Foundation", "Higher"}:
        sql += " AND tier IN (%s, 'Both')"
        params.append(tier)
    sql += " ORDER BY topic, title, id"
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify({"resources": [resource_json(row) for row in rows]})


@bp.post("/api/resources")
def create_resource():
    body, problem = json_body()
    if problem:
        return problem
    data, errors = validate_resource(body)
    if errors:
        return error("Validation failed", 400, errors)
    with get_connection() as conn:
        row = conn.execute(
            f"INSERT INTO resources (id, tutor_id, title, url, topic, tier) VALUES (%s, %s, %s, %s, %s, %s) RETURNING {RESOURCE_SELECT}",
            (f"res_{uuid.uuid4().hex[:12]}", g.tutor_id, data["title"], data["url"], data["topic"], data["tier"]),
        ).fetchone()
        conn.commit()
    return jsonify({"resource": resource_json(row)}), 201


@bp.patch("/api/resources/<resource_id>")
def update_resource(resource_id):
    body, problem = json_body()
    if problem:
        return problem
    data, errors = validate_resource(body, partial=True)
    if errors:
        return error("Validation failed", 400, errors)
    columns = ("title", "url", "topic", "tier")
    assignments = [f"{key} = %s" for key in columns if key in data]
    values = [data[key] for key in columns if key in data]
    if not assignments:
        return error("Validation failed", 400, {"body": "No editable fields supplied"})
    with get_connection() as conn:
        row = conn.execute(
            f"UPDATE resources SET {', '.join(assignments)}, updated_at = now() WHERE id = %s AND tutor_id = %s RETURNING {RESOURCE_SELECT}",
            [*values, resource_id, g.tutor_id],
        ).fetchone()
        if not row:
            return error("Resource not found", 404)
        conn.commit()
    return jsonify({"resource": resource_json(row)})


def owned_resource_ids(conn, tutor_id: str, resource_ids: list[str]) -> bool:
    if not resource_ids:
        return True
    rows = conn.execute(
        "SELECT id FROM resources WHERE tutor_id = %s AND id = ANY(%s)",
        (tutor_id, resource_ids),
    ).fetchall()
    return {row["id"] for row in rows} == set(resource_ids)


def replace_lesson_resources(conn, tutor_id: str, lesson_id: str, resource_ids: list[str]) -> None:
    conn.execute("DELETE FROM lesson_resources WHERE lesson_id = %s AND tutor_id = %s", (lesson_id, tutor_id))
    for resource_id in resource_ids:
        conn.execute(
            "INSERT INTO lesson_resources (lesson_id, resource_id, tutor_id) VALUES (%s, %s, %s)",
            (lesson_id, resource_id, tutor_id),
        )


def lesson_resource_ids(conn, tutor_id: str, lesson_id: str) -> list[str]:
    rows = conn.execute(
        "SELECT resource_id FROM lesson_resources WHERE tutor_id = %s AND lesson_id = %s ORDER BY resource_id",
        (tutor_id, lesson_id),
    ).fetchall()
    return [row["resource_id"] for row in rows]
