CREATE TYPE exercise_type AS ENUM (
    'chord_hold', 'chord_transition', 'strumming', 'fingerpicking', 'scale'
);

CREATE TABLE lessons (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         TEXT NOT NULL,
    description   TEXT,
    difficulty    INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    duration_mins INT NOT NULL DEFAULT 15,
    style_tags    TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_difficulty ON lessons(difficulty);
CREATE INDEX idx_lessons_style ON lessons USING GIN(style_tags);

CREATE TABLE exercises (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    order_index      INT NOT NULL,
    exercise_type    exercise_type NOT NULL,
    chord_voicing_id UUID REFERENCES chord_voicings(id),
    bpm              INT,
    instructions     TEXT,
    UNIQUE(lesson_id, order_index)
);

CREATE INDEX idx_exercises_lesson ON exercises(lesson_id);

-- ── Practice sessions ─────────────────────────────────────────────────────────

CREATE TABLE practice_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMPTZ,
    duration_secs INT,   -- computed on end_session
    notes         TEXT
);

-- Partition by month for scale (10k+ users × daily sessions = millions of rows fast)
-- In production: CREATE TABLE practice_sessions PARTITION BY RANGE (started_at)
-- and create monthly partitions. For now a simple index is fine.

CREATE INDEX idx_sessions_user     ON practice_sessions(user_id);
CREATE INDEX idx_sessions_started  ON practice_sessions(user_id, started_at DESC);

CREATE TABLE exercise_results (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id       UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    chord_voicing_id UUID NOT NULL REFERENCES chord_voicings(id),
    accuracy_score   INT NOT NULL CHECK (accuracy_score BETWEEN 0 AND 100),
    timing_score     INT CHECK (timing_score BETWEEN 0 AND 100),
    pitch_score      INT CHECK (pitch_score BETWEEN 0 AND 100),
    feedback_json    JSONB,
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_results_session   ON exercise_results(session_id);
CREATE INDEX idx_results_voicing   ON exercise_results(chord_voicing_id);
-- For progress queries (aggregates by user across sessions)
CREATE INDEX idx_results_user_date ON exercise_results(session_id, recorded_at DESC);
