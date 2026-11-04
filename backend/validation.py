"""Server-side validation for student and lesson JSON. Never trust the browser."""

from __future__ import annotations

from datetime import datetime, time

YEAR_GROUPS = {"Year 9", "Year 10", "Year 11", "Post-16 resit"}
EXAM_BOARDS = {"AQA", "Edexcel", "OCR", "WJEC Eduqas"}
TIERS = {"Foundation", "Higher"}
LESSON_STATUSES = {"scheduled", "completed", "cancelled"}
LESSON_DURATIONS = {30, 45, 60, 90}

MAX_NAME_LENGTH = 80
MAX_TOPIC_LENGTH = 120
MAX_GOAL_LENGTH = 200
MAX_GOALS = 20
MAX_NOTE_LENGTH = 2000
MAX_TOPICS = 30
MAX_LINKS = 20
MAX_URL_LENGTH = 500


def as_trimmed_string(value) -> str | None:
    if not isinstance(value, str):
        return None
    return value.strip()


def _require_string_list(value, field: str, errors: dict[str, str], *, max_items: int, max_len: int) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        errors[field] = "Must be a list of text items"
        return []
    cleaned = [item.strip() for item in value if item.strip()]
    if len(cleaned) > max_items:
        errors[field] = f"Add at most {max_items} items"
    elif any(len(item) > max_len for item in cleaned):
        errors[field] = f"Each item must be at most {max_len} characters"
    return cleaned


def _optional_note(value, field: str, errors: dict[str, str]) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        errors[field] = "Must be text"
        return ""
    note = value.strip()
    if len(note) > MAX_NOTE_LENGTH:
        errors[field] = f"Must be at most {MAX_NOTE_LENGTH} characters"
    return note


def _grade(value, field: str, errors: dict[str, str]) -> int | None:
    if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 9:
        errors[field] = "Must be a whole number from 1 to 9"
        return None
    return value


def validate_student(body, *, partial: bool = False) -> tuple[dict | None, dict[str, str]]:
    errors: dict[str, str] = {}
    if not isinstance(body, dict):
        return None, {"body": "Request must be a JSON object"}
    if partial and not body:
        return None, {"body": "Send at least one field to update"}

    data: dict = {}

    if not partial or "firstName" in body:
        first_name = as_trimmed_string(body.get("firstName"))
        if not first_name:
            errors["firstName"] = "First name is required"
        elif len(first_name) > MAX_NAME_LENGTH:
            errors["firstName"] = f"First name must be at most {MAX_NAME_LENGTH} characters"
        else:
            data["first_name"] = first_name

    if not partial or "lastName" in body:
        last_name = as_trimmed_string(body.get("lastName"))
        if not last_name:
            errors["lastName"] = "Last name is required"
        elif len(last_name) > MAX_NAME_LENGTH:
            errors["lastName"] = f"Last name must be at most {MAX_NAME_LENGTH} characters"
        else:
            data["last_name"] = last_name

    if not partial or "yearGroup" in body:
        year_group = as_trimmed_string(body.get("yearGroup"))
        if year_group not in YEAR_GROUPS:
            errors["yearGroup"] = "Choose a valid year group"
        else:
            data["year_group"] = year_group

    if not partial or "examBoard" in body:
        exam_board = as_trimmed_string(body.get("examBoard"))
        if exam_board not in EXAM_BOARDS:
            errors["examBoard"] = "Choose a valid exam board"
        else:
            data["exam_board"] = exam_board

    if not partial or "tier" in body:
        tier = as_trimmed_string(body.get("tier"))
        if tier not in TIERS:
            errors["tier"] = "Choose Foundation or Higher"
        else:
            data["tier"] = tier

    if not partial or "currentGrade" in body:
        grade = _grade(body.get("currentGrade"), "currentGrade", errors)
        if grade is not None:
            data["current_grade"] = grade

    if not partial or "targetGrade" in body:
        grade = _grade(body.get("targetGrade"), "targetGrade", errors)
        if grade is not None:
            data["target_grade"] = grade

    if not partial or "nextTopic" in body:
        next_topic = body.get("nextTopic", "")
        if next_topic is None:
            next_topic = ""
        if not isinstance(next_topic, str):
            errors["nextTopic"] = "First topic must be text"
        else:
            next_topic = next_topic.strip()
            if len(next_topic) > MAX_TOPIC_LENGTH:
                errors["nextTopic"] = f"Topic must be at most {MAX_TOPIC_LENGTH} characters"
            else:
                data["next_topic"] = next_topic

    if not partial or "learningGoals" in body:
        data["learning_goals"] = _require_string_list(
            body.get("learningGoals", []),
            "learningGoals",
            errors,
            max_items=MAX_GOALS,
            max_len=MAX_GOAL_LENGTH,
        )

    tier = data.get("tier")
    if tier == "Foundation":
        if data.get("current_grade", 0) > 5:
            errors["currentGrade"] = "Foundation tier caps at grade 5"
        if data.get("target_grade", 0) > 5:
            errors["targetGrade"] = "Foundation tier caps at grade 5"

    if errors:
        return None, errors
    return data, {}


def validate_lesson(body, *, partial: bool = False) -> tuple[dict | None, dict[str, str]]:
    errors: dict[str, str] = {}
    if not isinstance(body, dict):
        return None, {"body": "Request must be a JSON object"}
    if partial and not body:
        return None, {"body": "Send at least one field to update"}

    data: dict = {}

    if not partial or "studentId" in body:
        student_id = as_trimmed_string(body.get("studentId"))
        if not student_id:
            errors["studentId"] = "Choose a student"
        else:
            data["student_id"] = student_id

    if not partial or "date" in body:
        raw_date = as_trimmed_string(body.get("date"))
        try:
            data["date"] = datetime.strptime(raw_date or "", "%Y-%m-%d").date()
        except ValueError:
            errors["date"] = "Date must be YYYY-MM-DD"

    if not partial or "startTime" in body:
        raw_time = as_trimmed_string(body.get("startTime"))
        try:
            parsed = datetime.strptime(raw_time or "", "%H:%M")
            data["start_time"] = time(parsed.hour, parsed.minute)
        except ValueError:
            errors["startTime"] = "Start time must be HH:mm"

    if not partial or "durationMinutes" in body:
        duration = body.get("durationMinutes")
        if duration not in LESSON_DURATIONS:
            errors["durationMinutes"] = "Duration must be 30, 45, 60 or 90 minutes"
        else:
            data["duration_minutes"] = duration

    if not partial or "status" in body:
        status = as_trimmed_string(body.get("status"))
        if status not in LESSON_STATUSES:
            errors["status"] = "Status must be scheduled, completed or cancelled"
        else:
            data["status"] = status

    if not partial or "topicsCovered" in body:
        data["topics_covered"] = _require_string_list(
            body.get("topicsCovered", []),
            "topicsCovered",
            errors,
            max_items=MAX_TOPICS,
            max_len=MAX_TOPIC_LENGTH,
        )

    if not partial or "strengths" in body:
        data["strengths"] = _optional_note(body.get("strengths", ""), "strengths", errors)
    if not partial or "difficulties" in body:
        data["difficulties"] = _optional_note(body.get("difficulties", ""), "difficulties", errors)
    if not partial or "homework" in body:
        data["homework"] = _optional_note(body.get("homework", ""), "homework", errors)
    if not partial or "nextLessonPlan" in body:
        data["next_lesson_plan"] = _optional_note(body.get("nextLessonPlan", ""), "nextLessonPlan", errors)

    if not partial or "resourceLinks" in body:
        links = _require_string_list(
            body.get("resourceLinks", []),
            "resourceLinks",
            errors,
            max_items=MAX_LINKS,
            max_len=MAX_URL_LENGTH,
        )
        for url in links:
            if not url.startswith("http://") and not url.startswith("https://"):
                errors["resourceLinks"] = "Links must start with http:// or https://"
                break
        data["resource_links"] = links

    if not partial or "resourceIds" in body:
        resource_ids = body.get("resourceIds", [])
        if not isinstance(resource_ids, list) or any(
            not isinstance(item, str) or not item.startswith("res_") or len(item) > 64
            for item in resource_ids
        ):
            errors["resourceIds"] = "Choose valid saved resources"
        elif len(resource_ids) > MAX_LINKS or len(set(resource_ids)) != len(resource_ids):
            errors["resourceIds"] = f"Choose at most {MAX_LINKS} distinct resources"
        else:
            data["resource_ids"] = resource_ids

    if errors:
        return None, errors
    return data, {}
