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

    other = create_app({"TESTING": True, "TUTOR_ID": "tut_other"}).test_client()
    assert other.get(f"/api/students/{student_id}").status_code == 404
    assert other.get(f"/api/lessons/{lesson_id}").status_code == 404
    assert other.get("/api/students").get_json()["students"] == []
    assert other.patch(f"/api/students/{student_id}", json={"targetGrade": 4}).status_code == 404
