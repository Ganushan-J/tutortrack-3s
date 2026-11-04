# tutortrack-3s

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_Hb7TgfrQ7QoGl9IsBYkZulhMMB7L)

## Getting Started

The UI is Next.js. The JSON API is Flask in `backend/`; Flask is the only process that talks to Supabase PostgreSQL. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` there — never commit that file and never paste it into chat.

Canonical API prefix: `/api`. Work package 1 covers students and lessons (create/list/get/update, plus student archive/restore). Authentication is a later package; until then every query is scoped to `TUTOR_ID` from the server environment (`tut_local` after migrate).

JSON arrays (`learningGoals`, `topicsCovered`, `resourceLinks`) are stored as JSONB. Lesson `date` / `startTime` are Europe/London civil values; `created_at` / `updated_at` / `archived_at` are UTC.

Frontend (terminal 1):

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
python app.py
pytest
```

Open [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health) — it should return `{"ok": true}`. Connecting the Next.js UI to this API is a later package.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
