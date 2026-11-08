from datetime import date

from app import create_app
from reports import build_monthly_draft, month_bounds
from tests.conftest import AuthClient
from tests.helpers import valid_lesson, valid_student


def sample_lesson(id, day, status="completed", **changes):
    item = {
        "id": id, "date": date.fromisoformat(day), "start_time": "17:00",
        "status": status, "topics_covered": ["Algebra"], "strengths": "",
        "difficulties": "", "next_lesson_plan": "",
    }
    item.update(changes)
    return item


def sample_observation(id, day, status="developing", **changes):
    item = {
        "id": id, "observed_on": date.fromisoformat(day), "topic": "Algebra",
        "status": status, "evidence": "", "next_action": "",
    }
    item.update(changes)
    return item


def test_month_bounds_include_december_to_january_and_reject_invalid():
    assert month_bounds("2026-12") == (date(2026, 12, 1), date(2027, 1, 1))
    assert month_bounds("2026-13") is None
    assert month_bounds("2026-1") is None


def test_draft_uses_only_completed_sessions_and_dated_evidence():
    student = {"id": "stu_alex", "first_name": "Alex", "last_name": "Taylor"}
    lessons = [
        sample_lesson("les_one", "2026-11-01", strengths="Solved equations unaided", difficulties="Fractions", next_lesson_plan="Revisit fractions"),
        sample_lesson("les_cancel", "2026-11-02", "cancelled", strengths="Should not appear"),
        sample_lesson("les_scheduled", "2026-11-03", "scheduled", topics_covered=["Geometry"]),
        sample_lesson("les_two", "2026-11-30", topics_covered=["Algebra", "Graphs"]),
        sample_lesson("les_dec", "2026-12-01", topics_covered=["Trigonometry"]),
    ]
    observations = [
        sample_observation("obs_one", "2026-11-04", evidence="Completed three questions", next_action="Try word problems"),
        sample_observation("obs_two", "2026-11-05", "needs_support", evidence="Struggled with fractions"),
        sample_observation("obs_dec", "2026-12-01", "independent", evidence="December evidence"),
    ]
    result = build_monthly_draft(student, lessons, observations, "2026-11")
    assert result["completedSessions"] == 2
    assert result["topics"] == ["Algebra", "Graphs"]
    assert any("Solved equations unaided" in item for item in result["progressEvidence"])
    assert any("Completed three questions" in item for item in result["progressEvidence"])
    assert any("Struggled with fractions" in item for item in result["areasToRevisit"])
    assert result["nextMonthPriorities"] == ["Try word problems", "Revisit fractions"]
    assert "Trigonometry" not in result["text"]
    assert "Should not appear" not in result["text"]


def test_empty_month_states_missing_evidence_honestly():
    student = {"id": "stu_alex", "first_name": "Alex", "last_name": "Taylor"}
    result = build_monthly_draft(student, [sample_lesson("les_cancel", "2026-11-02", "cancelled")], [], "2026-11")
    assert result["completedSessions"] == 0
    assert result["progressEvidence"] == []
    assert "No dated progress evidence recorded" in result["text"]
    assert "No next steps recorded" in result["text"]


def test_report_routes_require_login():
    app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    anonymous = app.test_client()
    assert anonymous.get("/api/students/stu_any/reports/2026-11").status_code == 401
    assert anonymous.put("/api/students/stu_any/reports/2026-11", json={"text": "Private"}).status_code == 401


def test_report_validates_month_and_content_before_database(client):
    assert client.get("/api/students/stu_any/reports/2026-13").status_code == 400
    assert client.put("/api/students/stu_any/reports/2026-11", json={"text": "  "}).status_code == 400
    assert client.put("/api/students/stu_any/reports/2026-11", json={"text": "X" * 50001}).status_code == 400


def test_saved_report_is_editable_and_scoped_to_owner(db_client):
    student_id = db_client.post("/api/students", json=valid_student()).get_json()["student"]["id"]
    another_id = db_client.post("/api/students", json=valid_student(firstName="Maya")).get_json()["student"]["id"]
    first = db_client.post("/api/lessons", json=valid_lesson(
        studentId=student_id, date="2026-11-04", status="completed",
        topicsCovered=["Linear equations"], strengths="Solved independently",
    ))
    assert first.status_code == 201
    db_client.post("/api/lessons", json=valid_lesson(studentId=student_id, date="2026-11-05", status="cancelled"))
    db_client.post("/api/lessons", json=valid_lesson(studentId=another_id, date="2026-11-06", status="completed", topicsCovered=["Geometry"]))
    db_client.post(f"/api/students/{student_id}/progress", json={
        "topic": "Linear equations", "status": "developing", "observedOn": "2026-11-07",
        "evidence": "Worked without prompts", "nextAction": "Try word problems",
    })

    route = f"/api/students/{student_id}/reports/2026-11"
    initial = db_client.get(route)
    assert initial.status_code == 200
    assert initial.get_json()["saved"] is None
    draft = initial.get_json()["draft"]
    assert draft["completedSessions"] == 1
    assert "Geometry" not in draft["text"]
    assert "Worked without prompts" in draft["text"]
    assert db_client.put(route, json={"text": draft["text"] + "\nTutor edit"}).status_code == 200
    updated = db_client.put(route, json={"text": "A revised, edited report."})
    assert updated.status_code == 200
    assert db_client.get(route).get_json()["saved"]["text"] == "A revised, edited report."
    assert db_client.get(f"/api/students/{student_id}/reports").get_json()["reports"][0]["month"] == "2026-11"
    assert db_client.get(f"/api/students/{another_id}/reports/2026-11").get_json()["saved"] is None
    db_client.post("/api/lessons", json=valid_lesson(studentId=student_id, date="2026-11-08", status="completed"))
    refreshed = db_client.get(route).get_json()
    assert refreshed["draft"]["completedSessions"] == 2
    assert refreshed["saved"]["text"] == "A revised, edited report."
    assert db_client.post(f"/api/students/{student_id}/archive").status_code == 200
    assert db_client.get(route).get_json()["saved"]["text"] == "A revised, edited report."

    other_app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    other_app.test_client_class = AuthClient
    other = other_app.test_client()
    login = other.post("/api/auth/login", json={"email": "other@example.test", "password": "other-password-123"})
    assert login.status_code == 200
    other.csrf_token = login.get_json()["csrfToken"]
    assert other.get(route).status_code == 404
    assert other.get(f"/api/students/{student_id}/reports").status_code == 404
    assert other.put(route, json={"text": "Overwritten"}).status_code == 404
    assert db_client.get(route).get_json()["saved"]["text"] == "A revised, edited report."
