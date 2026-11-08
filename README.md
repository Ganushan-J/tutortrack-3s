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
pytest
python app.py
```

Run `python setup_tutor.py` once to enter your email and a password locally (the password input is hidden). To deliberately replace it later, use `python setup_tutor.py --reset`. Open [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health) to confirm Flask is running, then [http://localhost:3000](http://localhost:3000) to sign in. A direct unauthenticated API request to `/api/students` must return `401`.

## Topic progress and resources

After updating the code, run `python migrate.py` again from `backend/`. This additive migration creates `topic_observations`, `resources`, and `lesson_resources` without deleting existing students or lessons. The student profile records dated topic observations with status, evidence and a next action; repeated observations remain in history. The Resources page stores searchable links tagged by topic and tier. Select saved links in the lesson form; `resourceIds` are validated and attached in the same database transaction as the lesson save. Existing one-off `resourceLinks` remain supported.

All these routes use the authenticated tutor session and `/api` prefix: `GET/POST /students/:id/progress`, `PATCH /progress/:id`, `GET/POST /resources`, `PATCH /resources/:id`. Each lesson response includes `resourceIds`; create/update accepts the array. The browser never supplies `tutor_id` as authority. Use fictional records in development.

## Monthly reports and dashboard

Run `python migrate.py` again from `backend/` after updating. The additive `monthly_reports` table keeps one editable report per student and calendar month; existing students and lessons are preserved. Visit Reports, choose a student (including an archived one) and month, review the generated text, edit it, and save. Copy or download the current text as a `.txt` file. Regenerating the draft uses the latest records; saved edits stay unchanged until you explicitly save again.

`GET /api/students/:id/reports/:month` returns a deterministic draft and any saved report; `PUT` at the same path saves edited text. `GET /api/students/:id/reports` lists saved months. The month is `YYYY-MM` in the lesson's Europe/London civil calendar. Completed lessons contribute session counts and recorded topics, strengths, difficulties and plans. Dated progress observations contribute evidence, needs-support areas and next actions. Cancelled and scheduled lessons are excluded; missing evidence is stated explicitly. All routes require the signed-in tutor and enforce record ownership.

Dashboard values come from persisted student and lesson API responses. The notes queue lists past unlogged lessons and completed lessons without a useful recap (a topic plus at least one of strengths, difficulties, homework or next plan); the other fields remain optional. Hours include completed sessions in the current calendar month, not cancelled sessions.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
