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
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing WP1 databases already have the tutors table. This additive
-- migration preserves their students and lessons.
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS password_hash TEXT;

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

-- Composite unique indexes support owner-preserving foreign keys below.
CREATE UNIQUE INDEX IF NOT EXISTS students_id_tutor_idx ON students (id, tutor_id);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_id_tutor_idx ON lessons (id, tutor_id);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_id_tutor_student_idx ON lessons (id, tutor_id, student_id);

CREATE TABLE IF NOT EXISTS topic_observations (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES tutors (id),
    student_id TEXT NOT NULL,
    lesson_id TEXT,
    topic TEXT NOT NULL CHECK (length(topic) BETWEEN 1 AND 120),
    status TEXT NOT NULL CHECK (status IN ('needs_support', 'developing', 'independent')),
    observed_on DATE NOT NULL,
    evidence TEXT NOT NULL DEFAULT '' CHECK (length(evidence) <= 2000),
    next_action TEXT NOT NULL DEFAULT '' CHECK (length(next_action) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (student_id, tutor_id) REFERENCES students (id, tutor_id),
    FOREIGN KEY (lesson_id, tutor_id, student_id) REFERENCES lessons (id, tutor_id, student_id)
);

CREATE INDEX IF NOT EXISTS observations_student_date_idx
    ON topic_observations (tutor_id, student_id, observed_on DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES tutors (id),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
    url TEXT NOT NULL CHECK (length(url) BETWEEN 1 AND 500),
    topic TEXT NOT NULL CHECK (length(topic) BETWEEN 1 AND 120),
    tier TEXT NOT NULL CHECK (tier IN ('Foundation', 'Higher', 'Both')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS resources_id_tutor_idx ON resources (id, tutor_id);
CREATE INDEX IF NOT EXISTS resources_tutor_topic_idx ON resources (tutor_id, topic, tier);

CREATE TABLE IF NOT EXISTS lesson_resources (
    lesson_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    tutor_id TEXT NOT NULL,
    PRIMARY KEY (lesson_id, resource_id),
    FOREIGN KEY (lesson_id, tutor_id) REFERENCES lessons (id, tutor_id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id, tutor_id) REFERENCES resources (id, tutor_id)
);

CREATE INDEX IF NOT EXISTS lesson_resources_tutor_idx ON lesson_resources (tutor_id, resource_id);

INSERT INTO tutors (id, email)
VALUES ('tut_local', 'tutor@localhost')
ON CONFLICT (id) DO NOTHING;
