CREATE TABLE chords (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    suffix TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

CREATE INDEX idx_chords_key
ON chords(key);

CREATE INDEX idx_chords_suffix
ON chords(suffix);

CREATE TABLE chord_positions (
    id SERIAL PRIMARY KEY,

    chord_id INTEGER NOT NULL
        REFERENCES chords(id)
        ON DELETE CASCADE,

    position_index INTEGER NOT NULL,

    frets VARCHAR(6) NOT NULL,
    fingers VARCHAR(6) NOT NULL,

    barres INTEGER,
    capo BOOLEAN NOT NULL,

    UNIQUE(chord_id, position_index)
);

CREATE INDEX idx_positions_chord
ON chord_positions(chord_id);
