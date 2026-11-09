from __future__ import annotations

from werkzeug.security import generate_password_hash

from app import create_app


class FakeConnection:
    def __init__(self, tutor):
        self.tutor = tutor

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params):
        return self

    def fetchone(self):
        return self.tutor


def test_login_session_and_logout_without_database(monkeypatch):
    tutor = {
        "id": "tut_local",
        "email": "tutor@example.test",
        "password_hash": generate_password_hash("test-password-123"),
    }
    monkeypatch.setattr("auth.get_connection", lambda: FakeConnection(tutor))
    app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    client = app.test_client()

    assert client.get("/api/students").status_code == 401
    assert client.post("/api/auth/login", json={"email": tutor["email"], "password": "wrong"}).status_code == 401
    response = client.post("/api/auth/login", json={"email": tutor["email"], "password": "test-password-123"})
    assert response.status_code == 200
    token = response.get_json()["csrfToken"]
    assert response.headers["Cache-Control"] == "no-store"
    assert client.get("/api/auth/me").get_json()["user"]["email"] == tutor["email"]
    assert client.post("/api/auth/logout").status_code == 403
    assert client.post("/api/auth/logout", headers={"X-CSRF-Token": token}).status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_missing_or_placeholder_secret_rejects_private_requests():
    for key in (None, "REPLACE_WITH_RANDOM_SECRET"):
        app = create_app({"TESTING": True, "SECRET_KEY": key})
        client = app.test_client()
        assert client.get("/api/health").status_code == 200
        assert client.post("/api/auth/login", json={"email": "x", "password": "y"}).status_code == 503


def test_production_login_cookie_is_secure(monkeypatch):
    monkeypatch.setenv("FLASK_DEBUG", "0")
    tutor = {
        "id": "tut_local",
        "email": "tutor@example.test",
        "password_hash": generate_password_hash("test-password-123"),
    }
    monkeypatch.setattr("auth.get_connection", lambda: FakeConnection(tutor))
    app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions"})
    response = app.test_client().post(
        "/api/auth/login", json={"email": tutor["email"], "password": "test-password-123"}
    )
    assert response.status_code == 200
    cookie = response.headers["Set-Cookie"]
    assert "Secure" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie
