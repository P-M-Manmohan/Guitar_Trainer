use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;


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


