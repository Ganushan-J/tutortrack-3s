# TutorTrack interview notes

## Two-minute explanation

“TutorTrack is a private GCSE maths tutor dashboard. I used Next.js and React for the forms and dashboard, a Flask JSON API for authentication and business rules, and Supabase PostgreSQL for durable data. The browser sends same-origin `/api` requests through a Next.js rewrite. Flask validates inputs, takes the tutor ID from the signed session, and scopes every query to that tutor. It writes students, lessons, observations, resources and monthly reports to PostgreSQL. The monthly draft is deterministic: it counts completed lessons in the selected calendar month and draws only on recorded notes and observations. The tutor can edit and save the result.”

## Data flow and design choices

- A tutor logs in with an email and password; Flask verifies a stored password hash and sets a 12-hour session cookie. The client obtains a CSRF token from the session endpoint and sends it for writes. Signing out clears the session. The Next.js UI does not hold database credentials.
- The API routes are grouped as `/api/auth/*`, `/api/students/*`, `/api/lessons/*`, `/api/resources`, `/api/progress/*` and `/api/students/:id/reports/:month`. Ownership checks use the session tutor ID; a different tutor's records cannot be fetched by guessing an ID.
- The core tables are `tutors`, `students`, `lessons`, `topic_observations`, `resources`, `lesson_resources` and `monthly_reports`. Foreign keys and ownership-preserving constraints protect relationships. Resource attachments use a join table; small ordered text lists are JSONB.
- Lesson dates/times are stored as Europe/London civil values to match the tutor's calendar. Audit timestamps are stored as UTC. The dashboard calculates hours from completed lessons and excludes cancellations.
- Reports never infer improvement from a missing note. They preserve tutor edits separately from the regenerated source draft.

## A real bug and fix

Initially the lesson form saved the lesson, then sent a second request to update the student's next topic. If the second request failed, the lesson appeared saved while the student profile still displayed an old topic. I changed the Flask create/update lesson endpoints to validate and save both values in one PostgreSQL transaction. The API returns the updated student so the React cache can refresh from the persisted response. Tests cover success, invalid linked resources and cross-owner access.

## Live demo

Use the fictional Alex Taylor flow in the README. Show a refresh after saving, a cancelled lesson excluded from taught hours, two dated observations of one topic, a saved report with honest missing-evidence text, and signed-out access denied. Keep a separate fictional production account; do not use real student information in the demonstration.

## Truthful CV option

“Built TutorTrack, a full-stack GCSE maths tutor dashboard using Next.js, Flask and PostgreSQL, with authenticated student and lesson records, topic progress, resource links and editable monthly feedback.”

Add “deployed” only after the production URL passes the complete fictional-data flow. Do not claim usage, time saved or AI output without evidence. Gemini and Slack are future ideas, not implemented features.
