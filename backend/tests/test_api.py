from tests.helpers import valid_lesson, valid_student


def test_health_does_not_need_database(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}


def test_create_student_rejects_invalid_payload_before_database(client):
    response = client.post("/api/students", json=valid_student(firstName=""))
    assert response.status_code == 400
    body = response.get_json()
    assert body["error"] == "Validation failed"
    assert "firstName" in body["errors"]


def test_create_student_requires_json_content_type(client):
    response = client.post("/api/students", data="{}", content_type="text/plain")
    assert response.status_code == 415


def test_create_lesson_rejects_invalid_duration_before_database(client):
    response = client.post("/api/lessons", json=valid_lesson(durationMinutes=10))
    assert response.status_code == 400
    assert "durationMinutes" in response.get_json()["errors"]


def test_student_and_lesson_lifecycle(db_client):
    created = db_client.post("/api/students", json=valid_student())
    assert created.status_code == 201
    student = created.get_json()["student"]
    student_id = student["id"]
    assert student["firstName"] == "Alex"
    assert student["archived"] is False

    listed = db_client.get("/api/students")
    assert listed.status_code == 200
    assert any(item["id"] == student_id for item in listed.get_json()["students"])

    fetched = db_client.get(f"/api/students/{student_id}")
    assert fetched.status_code == 200
    assert fetched.get_json()["student"]["lastName"] == "Taylor"

    patched = db_client.patch(f"/api/students/{student_id}", json={"targetGrade": 9})
    assert patched.status_code == 200
    assert patched.get_json()["student"]["targetGrade"] == 9

    lesson = db_client.post(
        "/api/lessons",
        json=valid_lesson(studentId=student_id, status="completed"),
    )
    assert lesson.status_code == 201
    lesson_id = lesson.get_json()["lesson"]["id"]
    assert lesson.get_json()["lesson"]["studentId"] == student_id

    filtered = db_client.get(f"/api/lessons?studentId={student_id}&status=completed")
    assert filtered.status_code == 200
    assert len(filtered.get_json()["lessons"]) == 1

    updated = db_client.patch(f"/api/lessons/{lesson_id}", json={"status": "cancelled"})
    assert updated.status_code == 200
    assert updated.get_json()["lesson"]["status"] == "cancelled"

    archived = db_client.post(f"/api/students/{student_id}/archive")
    assert archived.status_code == 200
    assert archived.get_json()["student"]["archived"] is True

    hidden = db_client.get("/api/students")
    assert all(item["id"] != student_id for item in hidden.get_json()["students"])

    still_there = db_client.get(f"/api/students/{student_id}")
    assert still_there.status_code == 200
    assert still_there.get_json()["student"]["archived"] is True

    blocked = db_client.post("/api/lessons", json=valid_lesson(studentId=student_id))
    assert blocked.status_code == 400
    assert "studentId" in blocked.get_json()["errors"]

    restored = db_client.post(f"/api/students/{student_id}/restore")
    assert restored.status_code == 200
    assert restored.get_json()["student"]["archived"] is False
    assert any(
        item["id"] == student_id for item in db_client.get("/api/students").get_json()["students"]
    )

    history = db_client.get(f"/api/lessons/{lesson_id}")
    assert history.status_code == 200
    assert history.get_json()["lesson"]["id"] == lesson_id


def test_owner_scoping_hides_other_tutor_records(db_client):
    created = db_client.post("/api/students", json=valid_student(firstName="Mina"))
    student_id = created.get_json()["student"]["id"]
    lesson_id = (
        db_client.post("/api/lessons", json=valid_lesson(studentId=student_id))
        .get_json()["lesson"]["id"]
    )

    from app import create_app
    from tests.conftest import AuthClient

    other_app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    other_app.test_client_class = AuthClient
    other = other_app.test_client()
    login = other.post("/api/auth/login", json={"email": "other@example.test", "password": "other-password-123"})
    assert login.status_code == 200
    other.csrf_token = login.get_json()["csrfToken"]
    assert other.get(f"/api/students/{student_id}").status_code == 404
    assert other.get(f"/api/lessons/{lesson_id}").status_code == 404
    assert other.get("/api/students").get_json()["students"] == []
    assert other.patch(f"/api/students/{student_id}", json={"targetGrade": 4}).status_code == 404


def test_lesson_save_updates_next_topic_in_same_transaction(db_client):
    student_id = db_client.post("/api/students", json=valid_student()).get_json()["student"]["id"]
    created = db_client.post(
        "/api/lessons",
        json=valid_lesson(studentId=student_id, status="completed", nextTopic="  Fractions  "),
    )
    assert created.status_code == 201
    lesson_id = created.get_json()["lesson"]["id"]
    assert created.get_json()["student"]["nextTopic"] == "Fractions"
    assert db_client.get(f"/api/students/{student_id}").get_json()["student"]["nextTopic"] == "Fractions"

    failed = db_client.patch(
        f"/api/lessons/{lesson_id}", json={"nextTopic": "Functions", "resourceIds": ["res_unknown"]}
    )
    assert failed.status_code == 400
    assert db_client.get(f"/api/students/{student_id}").get_json()["student"]["nextTopic"] == "Fractions"

    updated = db_client.patch(f"/api/lessons/{lesson_id}", json={"nextTopic": "  Functions "})
    assert updated.status_code == 200
    assert updated.get_json()["student"]["nextTopic"] == "Functions"

    archived = db_client.post(f"/api/students/{student_id}/archive")
    assert archived.get_json()["student"]["archived"] is True
    history = db_client.patch(f"/api/lessons/{lesson_id}", json={"strengths": "Edited recap"})
    assert history.status_code == 200
    assert db_client.patch(f"/api/lessons/{lesson_id}", json={"status": "scheduled"}).status_code == 400


def test_lesson_next_topic_cannot_update_another_tutor_student(db_client):
    student_id = db_client.post("/api/students", json=valid_student()).get_json()["student"]["id"]
    from app import create_app
    from tests.conftest import AuthClient

    other_app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    other_app.test_client_class = AuthClient
    other = other_app.test_client()
    login = other.post("/api/auth/login", json={"email": "other@example.test", "password": "other-password-123"})
    other.csrf_token = login.get_json()["csrfToken"]
    blocked = other.post("/api/lessons", json=valid_lesson(studentId=student_id, nextTopic="Other's topic"))
    assert blocked.status_code == 400
    assert db_client.get(f"/api/students/{student_id}").get_json()["student"]["nextTopic"] == "Linear equations"


def test_unauthenticated_requests_are_blocked(app):
    anonymous = app.test_client()
    assert anonymous.get("/api/health").status_code == 200
    assert anonymous.get("/api/students").status_code == 401
    assert anonymous.get("/api/lessons").status_code == 401
    assert anonymous.post("/api/students", json=valid_student()).status_code == 401
    assert anonymous.get("/api/auth/me").status_code == 401


def test_csrf_and_sign_out(client):
    assert client.get("/api/auth/me").get_json()["user"]["id"] == "tut_local"
    assert client.post("/api/students", json=valid_student(), headers={"X-CSRF-Token": "wrong"}).status_code == 403
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/students").status_code == 401


def test_bad_login_does_not_create_session(db_client):
    from app import create_app

    anonymous = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False}).test_client()
    assert anonymous.post("/api/auth/login", json={"email": "local@example.test", "password": "wrong"}).status_code == 401
    assert anonymous.get("/api/students").status_code == 401
