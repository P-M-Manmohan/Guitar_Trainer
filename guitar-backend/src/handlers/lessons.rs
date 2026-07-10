use axum::{
    extract::{Path, State},
    Json,
};

use crate::{
    services::auth::AuthUser, models::lessons::{Lesson, LessonSummary}, repositories::lessons_repository, AppState
};

pub async fn get_lesson_summary(
        State(state): State<AppState>,
    ) -> Result<Json<Vec<LessonSummary>>, axum::http::StatusCode> {
    
    let lesson_summary = lessons_repository::get_lesson_summary(
            &state.db,
        )   
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(Json(lesson_summary))
}


pub async fn get_lesson(
        State(state): State<AppState>,
        Path(id): Path<i64>,
        user: AuthUser,
    ) -> Result<Json<Lesson>, axum::http::StatusCode> {
    
    let lesson = lessons_repository::get_lesson(
            &state.db,
            id,
            user.id,
        )   
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(Json(lesson))
}
