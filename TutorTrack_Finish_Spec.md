TutorTrack — completion specification and agent handoff
Product goal: A private, usable GCSE maths tutor dashboard that lets one tutor manage students, record lessons, track topic progress, prepare the next session, organise resource links, and draft monthly feedback from actual lesson records. It must work after refresh and restart, be safe for its intended data, and be easy to explain in a software engineering interview.

Baseline inspected: Ganushan-J/tutortrack-3s on main, 4 November 2026. GitHub contains a Next.js/React/TypeScript black-and-orange UI with dashboard, student directory/profile, add-student form and lesson create/edit form. lib/tutor-store.tsx holds students and lessons in React memory, seeded by lib/sample-data.ts; data resets on reload. The checked-in tree has no Flask backend, database migrations, authentication, reports or resource library. next.config.mjs suppresses TypeScript build errors, and the README is the v0 scaffold. Re-audit the local Cursor checkout before editing: unpushed changes could make this snapshot stale. A separate older Ganushan-J/TutorTrack repository exists; do not mix its Flask/Jinja code into this project without an explicit migration decision.
1. Scope and finish line
Required release
1. Tutor access: One tutor can sign in and sign out. No student or parent account is needed. Unauthenticated requests cannot read or mutate student data. Protect API routes, handle session expiry, and keep secrets server-side.
2. Students: Create, list/search/filter, view, edit, and archive/reinstate a student. Fields: first/last name, year group, exam board, Foundation/Higher tier, current and target grades, learning goals, next topic. Archived students remain in historical lessons/reports but are excluded from the active list and scheduling picker by default. No destructive deletion of a student with lesson history.
3. Lessons: Schedule, view, edit and mark completed/cancelled. Fields already represented in the UI: student, date, start time, duration, status, topics covered, strengths, difficulties, homework, resource links, and next lesson plan. Lesson history appears on the student's profile. Past scheduled lessons and completed lessons lacking a useful recap appear in a notes queue. Define an explicit completion rule rather than forcing every optional notes field to be nonempty.
4. Topic progress: Add a dated observation for a student and topic: status (needs support/developing/independent), evidence or brief note, and next action. Show the observation history rather than overwriting one current status. This can be entered during lesson logging and shown on the profile.
5. Next-session planning: Show the student's next topic and latest next-lesson plan on the profile and upcoming lesson. Editing a lesson's next-topic choice must persist the profile update consistently; do not leave two conflicting values.
6. Resources: Save searchable resource links with title, URL, topic and tier tags; attach/link them to lessons. File uploads are outside the required release.
7. Monthly feedback: Select student and calendar month; populate an editable draft with number of completed sessions, topics, evidenced progress, areas to revisit and next-month priorities. Save the edited report and allow copy/export of its text. Do not invent progress from missing notes. A PDF can be a later enhancement.
8. Dashboard: Show genuine upcoming lessons, notes needing completion, recent activity and hours taught this month using stored records. Empty states should guide the tutor. No static demo counts in normal mode.
9. Release quality: Working production build and deployed frontend/API/database, usable mobile layout, form validation, helpful loading/error states, migrations, meaningful tests, setup/deployment documentation, and a fictional-data demo account or seed procedure.
Deliberately later
- Gemini: Optional next release: generate a draft monthly report or topic practice questions from selected records, with tutor review, source context, and clear failure handling. If this feature is already implemented locally, audit and test it rather than recreating it. Never send real student details to an external model without appropriate authorisation.
- Slack: Optional next release: a narrowly defined reminder workflow, such as reports due. Do not build general synchronisation for this release.
- Multi-tutor organisations, parent/student portals, billing, automated messaging to parents, file uploads, and a full GCSE curriculum planner are out of scope.
2. Architecture contract
Layer	Responsibility
Next.js / React / TypeScript	UI, navigation, form state and API calls; preserve the current dashboard theme. No direct PostgreSQL access or server secrets in client bundles.
Flask / Python	Auth, validation, application rules, JSON API, database transactions and report aggregation.
Supabase PostgreSQL	Durable storage and relational integrity. Flask is the only database client for app data.


Use one documented API base path and a consistent JSON contract. Prefer same-origin routing/proxy in deployment if practical; otherwise configure CORS for only the deployed frontend origin and secure session handling. The frontend must not silently fall back to sample data when the API fails. Keep fictional seed data in a separate demo/dev path. Use UTC timestamps for audit fields and explicit Europe/London handling for displayed lesson times, monthly boundaries and daylight-saving changes.

Canonical records: tutors/users, students, lessons, topic_observations, resources, reports. Add join tables or JSON columns for small string arrays according to actual query needs; document the choice. Foreign keys: lesson/student; observation/student and optional lesson; report/student and month; resource/lesson association. Use migrations, stable server-generated IDs, constraints and indexes for tutor, student and date. If keeping one tutor, still scope every query to the authenticated tutor. Never accept a tutor_id from the browser as authority.

Suggested API surface (adapt names to the existing app, then document the actual contract):
- Auth: POST /auth/login, POST /auth/logout, GET /auth/me.
- Students: GET/POST /students, GET/PATCH /students/:id, POST /students/:id/archive, POST /students/:id/restore.
- Lessons: GET/POST /lessons, GET/PATCH /lessons/:id; filters by student/date/status.
- Progress: GET/POST /students/:id/progress, PATCH /progress/:id if correcting an observation.
- Resources: GET/POST /resources, PATCH /resources/:id; associate a resource with a lesson.
- Reports: POST /reports/draft from a student/month, GET/POST/PATCH /reports for saved editable text.
- Dashboard: GET /dashboard/summary or derive it from the above endpoints when the dataset is small; maintain one definition for each metric.
Use clear 2xx/4xx/5xx responses, field errors for invalid inputs, and 404/403 behaviour that does not expose another tutor's records. Validate all inputs on Flask even when the UI also validates. Treat URLs as untrusted content and do not render user-entered notes as HTML.
3. Product acceptance checks
Use fictional people throughout development and demonstrations.
1. Sign in, create Alex Taylor with goals and a next topic; refresh and restart both apps; Alex remains. Edit the target grade and archive/restore Alex; history remains intact.
2. Schedule a lesson for Alex, then mark it completed with topics, a strength, a difficulty, homework, resource link and next plan. Refresh; it appears on Alex's profile and the dashboard metrics update. Cancelled lessons do not count as hours taught.
3. Add two dated observations of the same topic, first “needs support,” then “developing,” with evidence. Both remain visible in order.
4. Save a tagged resource link, find it by topic and attach it to a lesson. The link opens safely in a new tab.
5. Generate a draft for a month with two completed lessons. It includes only that month's completed lessons, identifies missing evidence honestly, and remains editable and saved after refresh. Another student's records never appear in it.
6. Sign out. A direct profile URL and direct API request cannot reveal Alex's data. Invalid forms show actionable errors without losing the user's input.
7. With no students or lessons, the dashboard/profile/list show coherent empty states. Mobile navigation and forms remain usable. Production frontend build and backend tests pass with TypeScript errors enabled.
4. Agent work packages (run in order)
0 — Audit and baseline. Inspect the latest local branch and git status. Inventory routes, components, store, existing backend, migrations, tests, environment files, deployed URLs and actual bugs. Run the existing install/build. Produce an implemented/partial/missing matrix against this spec, and choose the canonical repository. Preserve user changes. Do not claim that GitHub's older snapshot is current if local work exists.

1 — Data/API foundation. Add or repair the Flask app, configuration, database connection and migrations. Define the student and lesson models and serializers aligned to the existing TypeScript fields. Implement student create/list/get/update/archive and lesson create/list/get/update with owner scoping and validation. Add backend tests for key rules. Keep credentials out of git. A new schema must be reproducible from a clean database.

2 — Connect existing UI. Replace the in-memory lib/tutor-store.tsx behaviour with an API-backed data layer or equivalent. Make existing student/lesson forms await writes, show errors, and render persisted data after refresh. Keep sample data only in a clearly opt-in demo mode. Avoid a second source of truth in Next.js API routes.

3 — Authentication. Implement one tutor login/session flow, route/API protection and logout. Add a safe first-account setup method documented in README; no hardcoded public demo password for production. Test unauthenticated and cross-owner access.

4 — Progress and resources. Add observation history, next-action UI, resource link catalog/search/tags, and attachment to lessons. Keep data model and API minimal. Test record ownership and a repeated topic over time.

5 — Reports and dashboard. Build deterministic monthly aggregation and editable saved reports. Connect dashboard widgets to persisted data. Handle cancelled lessons, missing notes, time boundaries and empty months. Add targeted aggregation tests.

6 — Cleanup and hardening. Remove dead sample-only paths and duplicate state, fix validation and types, restore strict TypeScript build (ignoreBuildErrors: true must go), add lint/typecheck scripts, eliminate unused imports/dependencies, standardise API error handling and loading UI, review accessibility/responsive design. Correct UI copy such as “active students” after archive support. Re-run the full acceptance flow after refactoring.

7 — Deploy and document. Deploy Next.js and Flask with the database, HTTPS and appropriate environment variables. Apply migrations safely. Add README with architecture diagram, setup commands, env variable names, migrations, tests, deployment steps, screenshots and known limits. Test the production URL with fictional data after a fresh session. Keep a concise project explanation and truthful CV bullets based on verified behaviour.

For each package: one agent owns the change, works on a separate branch, reports changed files and test results, and proposes a PR. Integrate packages sequentially when they touch the same data model or API; parallelise only independent UI/docs/tests after the contract is agreed. Review the diff before merging. Ask agents to state assumptions, not to silently change stack or add libraries. A package is complete only when its acceptance check runs locally; deployment is complete only when the production check runs.
5. Definition of done and final outcome
TutorTrack is finished for this release when a tutor can sign in to the deployed app and complete the full flow student → scheduled/completed lesson → dated progress observation → next session plan/resource → editable monthly feedback, with durable, correctly scoped data. The dashboard derives from those same records. A clean checkout can be installed, configured, migrated, tested and run using the README. No secrets are committed; TypeScript/build and backend tests pass; the fictional demo works on the live site.

The portfolio demonstration should take 3–5 minutes and use fictional data. You should be able to explain the data flow, tables, API endpoints, how authentication limits access, one bug and its fix, and what Gemini/Slack do only if they are actually implemented. Any numerical claims about users, time saved or AI features require evidence; planned features should be labelled planned.
