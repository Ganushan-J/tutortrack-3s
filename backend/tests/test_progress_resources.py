from app import create_app
from progress_resources import validate_observation, validate_resource
from tests.conftest import AuthClient
from tests.helpers import valid_lesson, valid_student
from validation import validate_lesson


def test_progress_and_resource_validation_without_database():
    payload = {
        "topic": "Linear equations", "status": "developing", "observedOn": "2026-11-04",
        "evidence": "Solved two independently", "nextAction": "Try word problems",
    }
    assert validate_observation(payload)[1] == {}
    assert "status" in validate_observation({**payload, "status": "perfect"})[1]
    assert "observedOn" in validate_observation({**payload, "observedOn": "2026-02-30"})[1]
    resource = {"title": "Worksheet", "url": "javascript:alert(1)", "topic": "Algebra", "tier": "Higher"}
    assert "url" in validate_resource(resource)[1]
    assert "url" in validate_resource({**resource, "url": "https://example.org:bad/path"})[1]
    assert validate_resource({**resource, "url": "https://example.org/worksheet"})[1] == {}
    assert "resourceIds" in validate_lesson(valid_lesson(resourceIds=["res_one", "res_one"]))[1]


def test_private_progress_and_resources_require_login():
    app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    client = app.test_client()
    assert client.get("/api/resources").status_code == 401
    assert client.get("/api/students/stu_any/progress").status_code == 401
    assert client.post("/api/resources", json={}).status_code == 401


def test_observation_history_resource_catalog_and_lesson_attachment(db_client):
    created = db_client.post("/api/students", json=valid_student())
    assert created.status_code == 201
    student_id = created.get_json()["student"]["id"]
    first = db_client.post(f"/api/students/{student_id}/progress", json={
        "topic": "Linear equations", "status": "needs_support", "observedOn": "2026-11-01",
        "evidence": "Needed prompts", "nextAction": "Practise rearranging",
    })
    second = db_client.post(f"/api/students/{student_id}/progress", json={
        "topic": "Linear equations", "status": "developing", "observedOn": "2026-11-04",
        "evidence": "Solved two independently", "nextAction": "Try word problems",
    })
    assert first.status_code == second.status_code == 201
    observations = db_client.get(f"/api/students/{student_id}/progress").get_json()["observations"]
    assert [item["status"] for item in observations] == ["developing", "needs_support"]
    assert observations[1]["evidence"] == "Needed prompts"
    edited = db_client.patch(f"/api/progress/{first.get_json()['observation']['id']}", json={"nextAction": "Recap first"})
    assert edited.status_code == 200

    saved = db_client.post("/api/resources", json={
        "title": "Algebra practice", "url": "https://example.org/algebra",
        "topic": "Linear equations", "tier": "Both",
    })
    assert saved.status_code == 201
    resource_id = saved.get_json()["resource"]["id"]
    assert len(db_client.get("/api/resources?q=algebra&tier=Higher").get_json()["resources"]) == 1
    lesson = db_client.post("/api/lessons", json=valid_lesson(studentId=student_id, resourceIds=[resource_id]))
    assert lesson.status_code == 201
    lesson_id = lesson.get_json()["lesson"]["id"]
    assert lesson.get_json()["lesson"]["resourceIds"] == [resource_id]
    linked = db_client.post(f"/api/students/{student_id}/progress", json={
        "topic": "Linear equations", "status": "independent", "observedOn": "2026-11-05",
        "evidence": "Completed worksheet", "nextAction": "Move on", "lessonId": lesson_id,
    })
    assert linked.status_code == 201
    another_id = db_client.post("/api/students", json=valid_student(firstName="Maya")).get_json()["student"]["id"]
    moved = db_client.patch(f"/api/lessons/{lesson_id}", json={"studentId": another_id})
    assert moved.status_code == 400
    assert "studentId" in moved.get_json()["errors"]
    assert db_client.get(f"/api/lessons/{lesson_id}").get_json()["lesson"]["resourceIds"] == [resource_id]
    assert db_client.get("/api/lessons").get_json()["lessons"][0]["resourceIds"] == [resource_id]
    assert db_client.patch(f"/api/lessons/{lesson_id}", json={"resourceIds": []}).get_json()["lesson"]["resourceIds"] == []


def test_cross_owner_records_and_links_are_hidden(db_client):
    student_id = db_client.post("/api/students", json=valid_student()).get_json()["student"]["id"]
    resource_id = db_client.post("/api/resources", json={
        "title": "Practice", "url": "https://example.org/paper", "topic": "Algebra", "tier": "Higher",
    }).get_json()["resource"]["id"]
    observation_id = db_client.post(f"/api/students/{student_id}/progress", json={
        "topic": "Algebra", "status": "developing", "observedOn": "2026-11-04", "evidence": "", "nextAction": "",
    }).get_json()["observation"]["id"]
    other_app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    other_app.test_client_class = AuthClient
    other = other_app.test_client()
    login = other.post("/api/auth/login", json={"email": "other@example.test", "password": "other-password-123"})
    assert login.status_code == 200
    other.csrf_token = login.get_json()["csrfToken"]
    assert other.get(f"/api/students/{student_id}/progress").status_code == 404
    assert other.patch(f"/api/progress/{observation_id}", json={"topic": "Changed"}).status_code == 404
    assert other.get("/api/resources").get_json()["resources"] == []
    assert other.patch(f"/api/resources/{resource_id}", json={"title": "Changed"}).status_code == 404
    other_student = other.post("/api/students", json=valid_student(firstName="Other"))
    assert other_student.status_code == 201
    other_id = other_student.get_json()["student"]["id"]
    assert other.post("/api/lessons", json=valid_lesson(studentId=other_id, resourceIds=[resource_id])).status_code == 400
    assert other.post(f"/api/students/{other_id}/progress", json={
        "topic": "Algebra", "status": "developing", "observedOn": "2026-11-04",
        "lessonId": "les_missing", "evidence": "", "nextAction": "",
    }).status_code == 400
