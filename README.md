# tutortrack-3s

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_Hb7TgfrQ7QoGl9IsBYkZulhMMB7L)

## Getting Started

The UI is Next.js. The JSON API is Flask in `backend/`; Flask is the only process that talks to Supabase PostgreSQL. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` there — never commit that file and never paste it into chat.

Canonical API prefix: `/api`. Next.js forwards same-origin API requests to Flask using the server-only `FLASK_API_ORIGIN` setting. Flask is the sole PostgreSQL client. The session identifies the tutor; the browser never supplies an authoritative tutor ID.

Vercel builds the Next.js UI only; it does not host Flask. Deploy the Flask API separately in the release package, set `FLASK_API_ORIGIN` on the Next.js host to its HTTPS origin, and use HTTPS for session cookies. Use fictional records until the full production deployment and access checks are complete.

JSON arrays (`learningGoals`, `topicsCovered`, `resourceLinks`) are stored as JSONB. Lesson `date` / `startTime` are Europe/London civil values; `created_at` / `updated_at` / `archived_at` are UTC.

For a fresh checkout, copy the root `.env.example` to `.env.local` and the backend example to `backend/.env`. Fill in `DATABASE_URL` and generate a random `FLASK_SECRET_KEY` locally; neither secret belongs in GitHub or chat. If you already have `backend/.env`, add the secret key without changing your working `DATABASE_URL`.

Frontend (terminal 1, from project root):

```bash
pnpm dev
```

Backend (terminal 2):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python migrate.py
python setup_tutor.py
python app.py
pytest
```

Run `python setup_tutor.py` once to enter your email and a password locally (the password input is hidden). To deliberately replace it later, use `python setup_tutor.py --reset`. Open [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health) to confirm Flask is running, then [http://localhost:3000](http://localhost:3000) to sign in. A direct unauthenticated API request to `/api/students` must return `401`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
