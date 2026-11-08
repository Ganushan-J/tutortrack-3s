from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv
from flask.testing import FlaskClient
from werkzeug.datastructures import Headers
from werkzeug.security import generate_password_hash

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app  # noqa: E402
from db import SCHEMA_PATH, get_connection, run_sql_script  # noqa: E402


def database_configured() -> bool:
    return bool(os.getenv("DATABASE_URL", "").strip())


class AuthClient(FlaskClient):
    csrf_token = None

    def open(self, *args, **kwargs):
        if kwargs.get("method", "GET").upper() not in {"GET", "HEAD", "OPTIONS"} and self.csrf_token:
            headers = Headers(kwargs.get("headers") or {})
            if "X-CSRF-Token" not in headers:
                headers["X-CSRF-Token"] = self.csrf_token
            kwargs["headers"] = headers
        return super().open(*args, **kwargs)


@pytest.fixture
def app():
    result = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
    result.test_client_class = AuthClient
    return result


@pytest.fixture
def client(app, monkeypatch):
    monkeypatch.setattr(
        "auth.lookup_tutor",
        lambda tutor_id: {"id": tutor_id, "email": "test@example.test", "password_hash": "configured"},
    )
    result = app.test_client()
    with result.session_transaction() as session:
        session["tutor_id"] = "tut_local"
        session["csrf_token"] = "test-csrf"
    result.csrf_token = "test-csrf"
    return result


@pytest.fixture
def db_client(monkeypatch):
    if not database_configured():
        pytest.skip("DATABASE_URL is not set; skipping PostgreSQL tests")

    schema = f"tutortrack_wp1_{os.getpid()}"
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with get_connection() as conn:
        conn.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
        conn.execute(f"CREATE SCHEMA {schema}")
        conn.commit()

    original = get_connection

    def connect_to_test_schema():
        conn = original()
        conn.execute(f"SET search_path TO {schema}")
        return conn

    monkeypatch.setattr("app.get_connection", connect_to_test_schema)
    monkeypatch.setattr("db.get_connection", connect_to_test_schema)
    monkeypatch.setattr("auth.get_connection", connect_to_test_schema)
    monkeypatch.setattr("progress_resources.get_connection", connect_to_test_schema)
    monkeypatch.setattr("reports.get_connection", connect_to_test_schema)

    with connect_to_test_schema() as conn:
        run_sql_script(conn, sql)
        conn.execute(
            "UPDATE tutors SET email = %s, password_hash = %s WHERE id = %s",
            ("local@example.test", generate_password_hash("local-password-123"), "tut_local"),
        )
        conn.execute(
            "INSERT INTO tutors (id, email, password_hash) VALUES (%s, %s, %s)",
            ("tut_other", "other@example.test", generate_password_hash("other-password-123")),
        )
        conn.commit()

    try:
        test_app = create_app({"TESTING": True, "SECRET_KEY": "test-only-key-long-enough-for-sessions", "SESSION_COOKIE_SECURE": False})
        test_app.test_client_class = AuthClient
        result = test_app.test_client()
        response = result.post("/api/auth/login", json={"email": "local@example.test", "password": "local-password-123"})
        assert response.status_code == 200
        result.csrf_token = response.get_json()["csrfToken"]
        yield result
    finally:
        with original() as conn:
            conn.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
            conn.commit()
