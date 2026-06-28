use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

// ── Users ─────────────────────────────────────────────────────────────────────

#[derive(Debug, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub user_id: Uuid,
    pub display_name: String,
    pub experience_level: ExperienceLevel,
    pub preferred_tuning_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::Type, Serialize, Deserialize, Clone)]
#[sqlx(type_name = "experience_level", rename_all = "lowercase")]
pub enum ExperienceLevel {
    Beginner,
    Intermediate,
    Advanced,
}

// ── Tunings ───────────────────────────────────────────────────────────────────

#[derive(Debug, FromRow, Serialize)]
pub struct Tuning {
    pub id: Uuid,
    pub name: String,        // "Standard", "Drop D", "Open G"
    pub slug: String,        // "standard", "drop-d", "open-g"
    pub open_strings: JsonValue, // ["E2","A2","D3","G3","B3","E4"]
    pub string_count: i32,
}

// ── Chords ────────────────────────────────────────────────────────────────────

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Chord {
    pub id: Uuid,
    pub name: String,          // "G Major"
    pub root_note: String,     // "G"
    pub quality: String,       // "major", "minor", "7", "maj7", "sus2"
    pub intervals: Vec<String>,// ["1","3","5"]
}

#[derive(Debug, FromRow, Serialize)]
pub struct ChordVoicing {
    pub id: Uuid,
    pub chord_id: Uuid,
    pub tuning_id: Uuid,
    pub label: String,             // "open", "barre-5", "jazz-voicing"
    pub base_fret: i32,
    pub difficulty: i32,           // 1–5
    pub muted_strings: Vec<i32>,
    pub open_strings: Vec<i32>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct FingerPosition {
    pub id: Uuid,
    pub voicing_id: Uuid,
    pub string_num: i32,   // 1 = high E, 6 = low E
    pub fret: i32,
    pub finger: String,    // "index" | "middle" | "ring" | "pinky" | "thumb"
    pub is_barre: bool,
    pub barre_span: i32,   // number of strings the barre covers (0 if not barre)
}

// ── Practice ──────────────────────────────────────────────────────────────────

#[derive(Debug, FromRow, Serialize)]
pub struct PracticeSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_secs: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct ExerciseResult {
    pub id: Uuid,
    pub session_id: Uuid,
    pub chord_voicing_id: Uuid,
    pub accuracy_score: i32,     // 0–100
    pub timing_score: Option<i32>,
    pub pitch_score: Option<i32>,
    pub feedback_json: Option<JsonValue>, // AI feedback blob
    pub recorded_at: DateTime<Utc>,
}

// ── Lessons ───────────────────────────────────────────────────────────────────

#[derive(Debug, FromRow, Serialize)]
pub struct Lesson {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub difficulty: i32,
    pub duration_mins: i32,
    pub style_tags: Vec<String>, // ["fingerstyle","blues","classical"]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Exercise {
    pub id: Uuid,
    pub lesson_id: Uuid,
    pub title: String,
    pub order_index: i32,
    pub exercise_type: ExerciseType,
    pub chord_voicing_id: Option<Uuid>,
    pub bpm: Option<i32>,
    pub instructions: Option<String>,
}

#[derive(Debug, sqlx::Type, Serialize, Deserialize, Clone)]
#[sqlx(type_name = "exercise_type", rename_all = "snake_case")]
pub enum ExerciseType {
    ChordHold,
    ChordTransition,
    Strumming,
    Fingerpicking,
    Scale,
}

// ── Vision analysis ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LandmarkPoint {
    pub x: f32,
    pub y: f32,
    pub z: Option<f32>,
}

#[derive(Debug, Deserialize)]
pub struct HandLandmarks {
    pub left_hand: Option<Vec<LandmarkPoint>>,
    pub right_hand: Option<Vec<LandmarkPoint>>,
}

// ── Progress / stats ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DailyProgress {
    pub date: chrono::NaiveDate,
    pub sessions: i64,
    pub avg_accuracy: Option<f64>,
    pub total_mins: i64,
}
