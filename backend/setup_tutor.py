"""Interactive first-account setup. Run locally after migrate.py; never paste a password into chat."""

from __future__ import annotations

import argparse
import getpass
from pathlib import Path

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from db import current_tutor_id, get_connection

load_dotenv(Path(__file__).resolve().parent / ".env")


def main() -> None:
    parser = argparse.ArgumentParser(description="Set the TutorTrack tutor password")
    parser.add_argument("--reset", action="store_true", help="Replace an existing password")
    args = parser.parse_args()

    tutor_id = current_tutor_id()
    with get_connection() as conn:
        tutor = conn.execute("SELECT email, password_hash FROM tutors WHERE id = %s", (tutor_id,)).fetchone()
    if not tutor:
        raise SystemExit("Tutor row missing. Run python migrate.py first.")
    if tutor["password_hash"] and not args.reset:
        raise SystemExit("A password is already set. Use --reset only if you intend to replace it.")

    email = input("Tutor email: ").strip().lower()
    if "@" not in email or len(email) > 254:
        raise SystemExit("Enter a valid email address.")
    password = getpass.getpass("New password (at least 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12 or password != confirmation:
        raise SystemExit("Passwords did not match or were too short; nothing changed.")

    with get_connection() as conn:
        conn.execute(
            "UPDATE tutors SET email = %s, password_hash = %s WHERE id = %s",
            (email, generate_password_hash(password), tutor_id),
        )
        conn.commit()
    print("Tutor login configured. The password was not printed or saved in a file.")


if __name__ == "__main__":
    main()
