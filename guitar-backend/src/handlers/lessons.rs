use axum::{extract::{Path, Query, State}, routing::get, Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::{errors::{AppError, Result}, models::{Exercise, Lesson}, AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/lessons",          get(list_lessons))
        .route("/lessons/:id",      get(get_lesson))
        .route("/lessons/:id/exercises", get(lesson_exercises))
}

#[derive(Deserialize)]
pub struct LessonFilter {
    pub difficulty: Option<i32>,
    pub style: Option<String>,
    pub max_duration_mins: Option<i32>,
}

pub async fn list_lessons(
    State(state): State<AppState>,
    Query(filter): Query<LessonFilter>,
) -> Result<Json<Vec<Lesson>>> {
    let lessons = sqlx::query_as!(
        Lesson,
        r#"
        SELECT * FROM lessons
        WHERE ($1::int IS NULL OR difficulty = $1)
          AND ($2::text IS NULL OR $2 = ANY(style_tags))
          AND ($3::int IS NULL OR duration_mins <= $3)
        ORDER BY difficulty, created_at
        "#,
        filter.difficulty,
        filter.style,
        filter.max_duration_mins,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(lessons))
}

pub async fn get_lesson(
    State(state): State<AppState>,
    Path(lesson_id): Path<Uuid>,
) -> Result<Json<Lesson>> {
    let lesson = sqlx::query_as!(Lesson, "SELECT * FROM lessons WHERE id = $1", lesson_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("lesson not found".into()))?;

    Ok(Json(lesson))
}

pub async fn lesson_exercises(
    State(state): State<AppState>,
    Path(lesson_id): Path<Uuid>,
) -> Result<Json<Vec<Exercise>>> {
    let exercises = sqlx::query_as!(
        Exercise,
        r#"
        SELECT id, lesson_id, title, order_index,
               exercise_type AS "exercise_type: _",
               chord_voicing_id, bpm, instructions
        FROM exercises
        WHERE lesson_id = $1
        ORDER BY order_index
        "#,
        lesson_id
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(exercises))
}
