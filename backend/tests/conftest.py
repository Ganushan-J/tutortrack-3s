from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app  # noqa: E402
from db import SCHEMA_PATH, get_connection, run_sql_script  # noqa: E402


def database_configured() -> bool:
    return bool(os.getenv("DATABASE_URL", "").strip())


@pytest.fixture
def app():
    return create_app({"TESTING": True, "TUTOR_ID": "tut_local"})


@pytest.fixture
def client(app):
    return app.test_client()


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

    with connect_to_test_schema() as conn:
        run_sql_script(conn, sql)
        conn.execute(
            "INSERT INTO tutors (id, email) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING",
            ("tut_other", "other@localhost"),
        )
        conn.commit()

    try:
        yield create_app({"TESTING": True, "TUTOR_ID": "tut_local"}).test_client()
    finally:
        with original() as conn:
            conn.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
            conn.commit()
