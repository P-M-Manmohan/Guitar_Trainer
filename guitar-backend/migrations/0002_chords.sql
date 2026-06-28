CREATE TABLE tunings (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,  -- "standard", "drop-d"
    open_strings JSONB NOT NULL,        -- ["E2","A2","D3","G3","B3","E4"]
    string_count INT NOT NULL DEFAULT 6
);

CREATE TABLE chords (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name      TEXT NOT NULL,            -- "G Major"
    root_note TEXT NOT NULL,            -- "G"
    quality   TEXT NOT NULL,            -- "major" | "minor" | "7" | "maj7" ...
    intervals TEXT[] NOT NULL           -- {"1","3","5"}
);

CREATE UNIQUE INDEX idx_chords_name ON chords(name);
CREATE INDEX idx_chords_quality ON chords(quality);

CREATE TABLE chord_voicings (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chord_id       UUID NOT NULL REFERENCES chords(id) ON DELETE CASCADE,
    tuning_id      UUID NOT NULL REFERENCES tunings(id) ON DELETE CASCADE,
    label          TEXT NOT NULL,          -- "open", "barre-5"
    base_fret      INT NOT NULL DEFAULT 0,
    difficulty     INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    muted_strings  INT[] NOT NULL DEFAULT '{}',
    open_strings   INT[] NOT NULL DEFAULT '{}',
    UNIQUE(chord_id, tuning_id, label)
);

CREATE INDEX idx_voicings_chord   ON chord_voicings(chord_id);
CREATE INDEX idx_voicings_tuning  ON chord_voicings(tuning_id);
CREATE INDEX idx_voicings_diff    ON chord_voicings(difficulty);

CREATE TABLE finger_positions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voicing_id  UUID NOT NULL REFERENCES chord_voicings(id) ON DELETE CASCADE,
    string_num  INT NOT NULL CHECK (string_num BETWEEN 1 AND 8),
    fret        INT NOT NULL CHECK (fret >= 0),
    finger      TEXT NOT NULL CHECK (finger IN ('index','middle','ring','pinky','thumb')),
    is_barre    BOOL NOT NULL DEFAULT FALSE,
    barre_span  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_finger_pos_voicing ON finger_positions(voicing_id);

CREATE TABLE chord_tags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voicing_id  UUID NOT NULL REFERENCES chord_voicings(id) ON DELETE CASCADE,
    tag         TEXT NOT NULL,
    UNIQUE(voicing_id, tag)
);

CREATE INDEX idx_chord_tags_tag ON chord_tags(tag);

-- ── Seed: tunings ─────────────────────────────────────────────────────────────
INSERT INTO tunings (name, slug, open_strings) VALUES
('Standard',   'standard', '["E2","A2","D3","G3","B3","E4"]'),
('Drop D',     'drop-d',   '["D2","A2","D3","G3","B3","E4"]'),
('Open G',     'open-g',   '["D2","G2","D3","G3","B3","D4"]'),
('Open E',     'open-e',   '["E2","B2","E3","G3#","B3","E4"]'),
('DADGAD',     'dadgad',   '["D2","A2","D3","G3","A3","D4"]'),
('Half-step down', 'half-step-down', '["Eb2","Ab2","Db3","Gb3","Bb3","Eb4"]');

-- ── Seed: some common chords ──────────────────────────────────────────────────
INSERT INTO chords (name, root_note, quality, intervals) VALUES
('G Major',  'G', 'major', '{1,3,5}'),
('C Major',  'C', 'major', '{1,3,5}'),
('D Major',  'D', 'major', '{1,3,5}'),
('E Major',  'E', 'major', '{1,3,5}'),
('A Major',  'A', 'major', '{1,3,5}'),
('E Minor',  'E', 'minor', '{1,b3,5}'),
('A Minor',  'A', 'minor', '{1,b3,5}'),
('D Minor',  'D', 'minor', '{1,b3,5}'),
('F Major',  'F', 'major', '{1,3,5}'),
('G7',       'G', '7',     '{1,3,5,b7}'),
('Cmaj7',    'C', 'maj7',  '{1,3,5,7}'),
('Dsus2',    'D', 'sus2',  '{1,2,5}'),
('Asus4',    'A', 'sus4',  '{1,4,5}');
