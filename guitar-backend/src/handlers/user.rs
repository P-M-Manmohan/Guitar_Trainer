use axum::{
    http::StatusCode,
    extract:: {Path, State},
    Json,
};

use crate::{
    errors::AppError, models::users::{
        LessonCompletionRequest, PracticeTimeRequest, UserProfile}, repositories::user_repository, AppState
};
use crate::services::auth::AuthUser;

pub async fn profile(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<UserProfile>, AppError> {

    let profile = user_repository::get_profile(
        &state.db,
        user.id,
    )
    .await?;

    Ok(Json(profile))
}

pub async fn practice_time(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<PracticeTimeRequest>,
) -> Result<StatusCode, AppError> {

    user_repository::add_practice_time(
        &state.db,
        user.id,
        req.seconds,
    )
    .await?;

    Ok(StatusCode::OK)
}

pub async fn lesson_complete(
        State(state): State<AppState>,
        user: AuthUser,
        Path(id): Path<i64>,
        Json(req): Json<LessonCompletionRequest>
    ) -> Result<StatusCode, AppError> {

    if req.complete != 1 && req.complete != -1 {
        return Err(AppError::BadRequest(    
            "complete must be 1 or -1".into(),
            ));
    }
    
    user_repository::update_lessons(
        &state.db,
        user.id,
        req.complete,
        id,
        ).await?;

    Ok(StatusCode::OK)
}
