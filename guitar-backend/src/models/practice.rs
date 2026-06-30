use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;


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


