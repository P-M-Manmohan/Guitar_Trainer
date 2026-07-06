
use axum::{
    extract::State,
    Json,
};

use crate::{
    AppState,
    models::users::*,
    services::auth,
    errors::AppError,
};


pub async fn signup(
    State(state): State<AppState>,
    Json(req): Json<SignupRequest>,
) -> Result<Json<AuthResponse>, AppError> {

    println!("handler");

    let token = auth::signup(&state, req).await?;

    Ok(Json(AuthResponse {
        token,
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {

    let token = auth::login(&state, req).await?;

    Ok(Json(AuthResponse {
        token,
    }))
}
