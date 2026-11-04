"""One-tutor sign-in and session protection for all private API routes."""

from __future__ import annotations

import os
import secrets
from datetime import timedelta
from hmac import compare_digest

from flask import Flask, g, jsonify, request, session
from werkzeug.security import check_password_hash

from db import get_connection


def lookup_tutor(tutor_id: str):
    with get_connection() as conn:
        return conn.execute(
            "SELECT id, email, password_hash FROM tutors WHERE id = %s",
            (tutor_id,),
        ).fetchone()


def configure_auth(app: Flask) -> None:
    app.config.update(
        SECRET_KEY=os.getenv("FLASK_SECRET_KEY"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("FLASK_DEBUG", "0") != "1",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
    )

    @app.before_request
    def require_tutor_session():
        if not request.path.startswith("/api/") or request.path == "/api/health":
            return None
        if not isinstance(app.secret_key, str) or len(app.secret_key) < 32 or app.secret_key == "REPLACE_WITH_RANDOM_SECRET":
            return jsonify({"error": "Set a random FLASK_SECRET_KEY (at least 32 characters)"}), 503
        if request.endpoint == "auth_login":
            return None

        tutor_id = session.get("tutor_id")
        if not tutor_id:
            return jsonify({"error": "Please sign in"}), 401
        tutor = lookup_tutor(tutor_id)
        if not tutor or not tutor["password_hash"]:
            session.clear()
            return jsonify({"error": "Session expired. Please sign in again"}), 401

        if not session.get("csrf_token"):
            session.clear()
            return jsonify({"error": "Session expired. Please sign in again"}), 401

        g.tutor_id = tutor["id"]
        g.tutor_email = tutor["email"]
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            token = session.get("csrf_token")
            supplied = request.headers.get("X-CSRF-Token", "")
            if not token or not compare_digest(token, supplied):
                return jsonify({"error": "Invalid session token. Reload and try again"}), 403
        return None

    @app.post("/api/auth/login")
    def auth_login():
        if not request.is_json:
            return jsonify({"error": "Send JSON with Content-Type: application/json"}), 415
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"error": "Invalid credentials"}), 401
        email, password = body.get("email"), body.get("password")
        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify({"error": "Invalid credentials"}), 401
        with get_connection() as conn:
            tutor = conn.execute(
                "SELECT id, email, password_hash FROM tutors WHERE lower(email) = lower(%s)",
                (email.strip(),),
            ).fetchone()
        if not tutor or not tutor["password_hash"] or not check_password_hash(tutor["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        session.clear()
        session.permanent = True
        session["tutor_id"] = tutor["id"]
        session["csrf_token"] = secrets.token_urlsafe(32)
        return jsonify({"user": {"id": tutor["id"], "email": tutor["email"]}, "csrfToken": session["csrf_token"]})

    @app.get("/api/auth/me")
    def auth_me():
        return jsonify({"user": {"id": g.tutor_id, "email": g.tutor_email}, "csrfToken": session["csrf_token"]})

    @app.post("/api/auth/logout")
    def auth_logout():
        session.clear()
        return jsonify({"ok": True})

