from tests.helpers import valid_lesson, valid_student
from validation import validate_lesson, validate_student


def test_student_requires_names():
    payload, errors = validate_student(valid_student(firstName="  ", lastName=""))
    assert payload is None
    assert "firstName" in errors
    assert "lastName" in errors


def test_foundation_rejects_grade_above_five():
    payload, errors = validate_student(
        valid_student(tier="Foundation", currentGrade=6, targetGrade=7)
    )
    assert payload is None
    assert errors["currentGrade"] == "Foundation tier caps at grade 5"
    assert errors["targetGrade"] == "Foundation tier caps at grade 5"


def test_student_rejects_unknown_year_group():
    payload, errors = validate_student(valid_student(yearGroup="Year 8"))
    assert payload is None
    assert "yearGroup" in errors


def test_student_patch_requires_a_field():
    payload, errors = validate_student({}, partial=True)
    assert payload is None
    assert "body" in errors


def test_student_patch_only_validates_provided_fields():
    payload, errors = validate_student({"targetGrade": 9}, partial=True)
    assert errors == {}
    assert payload == {"target_grade": 9}


def test_lesson_rejects_invalid_duration_and_time():
    payload, errors = validate_lesson(valid_lesson(durationMinutes=50, startTime="9am"))
    assert payload is None
    assert "durationMinutes" in errors
    assert "startTime" in errors


def test_lesson_allows_empty_notes_for_scheduled_sessions():
    payload, errors = validate_lesson(
        valid_lesson(
            status="scheduled",
            topicsCovered=[],
            strengths="",
            difficulties="",
            homework="",
            resourceLinks=[],
            nextLessonPlan="",
        )
    )
    assert errors == {}
    assert payload["topics_covered"] == []
    assert payload["strengths"] == ""


def test_lesson_rejects_non_http_links():
    payload, errors = validate_lesson(valid_lesson(resourceLinks=["javascript:alert(1)"]))
    assert payload is None
    assert "resourceLinks" in errors
