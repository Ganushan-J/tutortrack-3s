-- TutorTrack canonical schema (PostgreSQL / Supabase).
-- Apply with: python migrate.py
--
-- Array fields are JSONB (not join tables) because the current UI treats
-- learning goals, topics covered, and lesson resource URLs as small ordered
-- lists, not independently queried entities. Resource catalog and
-- topic_observations stay for later work packages.
--
-- Audit columns (created_at, updated_at, archived_at) are TIMESTAMPTZ in UTC.
-- lessons.date and lessons.start_time are the tutor-entered Europe/London
-- civil date and clock time, not UTC instants.

CREATE TABLE IF NOT EXISTS tutors (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES tutors (id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    year_group TEXT NOT NULL CHECK (
        year_group IN ('Year 9', 'Year 10', 'Year 11', 'Post-16 resit')
    ),
    exam_board TEXT NOT NULL CHECK (
        exam_board IN ('AQA', 'Edexcel', 'OCR', 'WJEC Eduqas')
    ),
    tier TEXT NOT NULL CHECK (tier IN ('Foundation', 'Higher')),
    current_grade INTEGER NOT NULL CHECK (current_grade BETWEEN 1 AND 9),
    target_grade INTEGER NOT NULL CHECK (target_grade BETWEEN 1 AND 9),
    learning_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_topic TEXT NOT NULL DEFAULT '',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES tutors (id),
    student_id TEXT NOT NULL REFERENCES students (id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30, 45, 60, 90)),
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    topics_covered JSONB NOT NULL DEFAULT '[]'::jsonb,
    strengths TEXT NOT NULL DEFAULT '',
    difficulties TEXT NOT NULL DEFAULT '',
    homework TEXT NOT NULL DEFAULT '',
    resource_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_lesson_plan TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_tutor_name_idx
    ON students (tutor_id, last_name, first_name);

CREATE INDEX IF NOT EXISTS students_tutor_active_idx
    ON students (tutor_id)
    WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS lessons_tutor_date_idx
    ON lessons (tutor_id, date, start_time);

CREATE INDEX IF NOT EXISTS lessons_student_date_idx
    ON lessons (student_id, date);

INSERT INTO tutors (id, email)
VALUES ('tut_local', 'tutor@localhost')
ON CONFLICT (id) DO NOTHING;
