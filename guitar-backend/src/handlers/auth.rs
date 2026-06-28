use axum::{extract::State, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::{
    errors::{AppError, Result},
    middleware::auth::{validate_token, TokenType},
    models::User,
    services::auth as auth_svc,
    AppState,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login",    post(login))
        .route("/auth/refresh",  post(refresh))
        .route("/auth/logout",   post(logout))
}

// ── Register ──────────────────────────────────────────────────────────────────

#[derive(Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
    #[validate(length(min = 2, max = 64))]
    pub display_name: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
    pub user_id: Uuid,
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>> {
    body.validate().map_err(|e| AppError::Validation(e.to_string()))?;

    let email = body.email.to_lowercase();
    let password_hash = auth_svc::hash_password(&body.password)?;

    // Insert user + profile in a transaction
    let user_id = sqlx::query_scalar!(
        r#"
        WITH new_user AS (
            INSERT INTO users (email, password_hash)
            VALUES ($1, $2)
            RETURNING id
        ),
        new_profile AS (
            INSERT INTO user_profiles (user_id, display_name, experience_level)
            SELECT id, $3, 'beginner'
            FROM new_user
        )
        SELECT id FROM new_user
        "#,
        email,
        password_hash,
        body.display_name,
    )
    .fetch_one(&state.db)
    .await?;

    let tokens = auth_svc::issue_token_pair(user_id, &email, &state.config)?;
    let mut redis = state.redis.clone();
    auth_svc::store_refresh_token(&mut redis, user_id, &tokens.refresh_token, state.config.refresh_token_expiry_secs).await?;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user_id,
    }))
}

// ── Login ─────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    let email = body.email.to_lowercase();

    let user = sqlx::query_as!(
        User,
        "SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1",
        email
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("invalid credentials".into()))?;

    // Always run verify_password even on not-found to avoid timing attacks
    if !auth_svc::verify_password(&body.password, &user.password_hash)? {
        return Err(AppError::Unauthorized("invalid credentials".into()));
    }

    let tokens = auth_svc::issue_token_pair(user.id, &user.email, &state.config)?;
    let mut redis = state.redis.clone();
    auth_svc::store_refresh_token(&mut redis, user.id, &tokens.refresh_token, state.config.refresh_token_expiry_secs).await?;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user_id: user.id,
    }))
}

// ── Refresh ───────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>> {
    let claims = validate_token(&body.refresh_token, &state.config.jwt_secret)
        .map_err(|_| AppError::Unauthorized("invalid refresh token".into()))?;

    if claims.token_type != TokenType::Refresh {
        return Err(AppError::Unauthorized("wrong token type".into()));
    }

    let mut redis = state.redis.clone();
    if !auth_svc::refresh_token_is_valid(&mut redis, claims.sub, &body.refresh_token).await? {
        return Err(AppError::Unauthorized("refresh token revoked".into()));
    }

    // Rotate: revoke old, issue new
    auth_svc::revoke_refresh_token(&mut redis, claims.sub, &body.refresh_token).await?;
    let tokens = auth_svc::issue_token_pair(claims.sub, &claims.email, &state.config)?;
    auth_svc::store_refresh_token(&mut redis, claims.sub, &tokens.refresh_token, state.config.refresh_token_expiry_secs).await?;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user_id: claims.sub,
    }))
}

// ── Logout ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct LogoutRequest {
    pub refresh_token: String,
}

pub async fn logout(
    State(state): State<AppState>,
    Json(body): Json<LogoutRequest>,
) -> Result<Json<serde_json::Value>> {
    if let Ok(claims) = validate_token(&body.refresh_token, &state.config.jwt_secret) {
        let mut redis = state.redis.clone();
        auth_svc::revoke_refresh_token(&mut redis, claims.sub, &body.refresh_token).await?;
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}
