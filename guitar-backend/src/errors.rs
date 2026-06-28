use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("forbidden: {0}")]
    Forbidden(String),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("rate limited")]
    RateLimited,

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),

    #[error("validation error: {0}")]
    Validation(String),

    #[error("S3 error: {0}")]
    Storage(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Never leak internal details to clients in production
        let (status, message) = match &self {
            AppError::NotFound(msg)      => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::Unauthorized(msg)  => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Forbidden(msg)     => (StatusCode::FORBIDDEN, msg.clone()),
            AppError::BadRequest(msg)    => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Conflict(msg)      => (StatusCode::CONFLICT, msg.clone()),
            AppError::RateLimited        => (StatusCode::TOO_MANY_REQUESTS, "too many requests".into()),
            AppError::Validation(msg)    => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::Database(e) => {
                // Unique constraint = conflict, everything else = 500
                if let sqlx::Error::Database(ref db_err) = e {
                    if db_err.constraint().is_some() {
                        return (StatusCode::CONFLICT, Json(json!({ "error": "resource already exists" }))).into_response();
                    }
                }
                tracing::error!(err = %e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".into())
            }
            AppError::Redis(e) => {
                tracing::error!(err = %e, "redis error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".into())
            }
            AppError::Internal(e) => {
                tracing::error!(err = %e, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".into())
            }
            AppError::Storage(e) => {
                tracing::error!(err = %e, "storage error");
                (StatusCode::INTERNAL_SERVER_ERROR, "storage error".into())
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
