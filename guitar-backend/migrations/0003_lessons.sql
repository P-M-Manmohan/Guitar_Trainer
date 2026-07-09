CREATE TABLE lessons
(
    id BIGSERIAL PRIMARY KEY,

    title TEXT NOT NULL,

    description TEXT NOT NULL,

    url TEXT NOT NULL
);

CREATE TABLE lessons_completed
(
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, lesson_id)
);
