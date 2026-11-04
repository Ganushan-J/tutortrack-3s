"""Apply schema.sql to DATABASE_URL. Safe to re-run."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from db import apply_schema, get_connection

load_dotenv(Path(__file__).resolve().parent / ".env")


def migrate() -> None:
    with get_connection() as conn:
        apply_schema(conn)
    print("Schema applied.")


if __name__ == "__main__":
    migrate()
