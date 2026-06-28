use axum::{
    body::Body,
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{errors::AppError, AppState};

// ── Claims ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,           // user_id
    pub email: String,
    pub exp: u64,
    pub iat: u64,
    pub token_type: TokenType,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TokenType {
    Access,
    Refresh,
}

// ── Extension injected into request ──────────────────────────────────────────
// Handlers extract this with: Extension<AuthUser>

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
}

// ── Middleware ────────────────────────────────────────────────────────────────
// Runs on every request. If a valid token is present → injects AuthUser.
// If absent or invalid → continues without it (protected routes check explicitly).

pub async fn optional_auth(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    if let Some(token) = extract_bearer(&req) {
        match validate_token(&token, &state.config.jwt_secret) {
            Ok(claims) if claims.token_type == TokenType::Access => {
                req.extensions_mut().insert(AuthUser {
                    user_id: claims.sub,
                    email: claims.email,
                });
            }
            _ => {} // invalid token — just don't inject AuthUser
        }
    }
    Ok(next.run(req).await)
}

// ── Helper used by handlers to enforce auth ───────────────────────────────────

pub fn require_auth(req: &Request<Body>) -> crate::errors::Result<AuthUser> {
    req.extensions()
        .get::<AuthUser>()
        .cloned()
        .ok_or_else(|| AppError::Unauthorized("missing or invalid token".into()))
}

// ── Token utilities ───────────────────────────────────────────────────────────

pub fn validate_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    let data = decode::<Claims>(token, &key, &Validation::default())?;
    Ok(data.claims)
}

pub fn extract_bearer(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .map(str::to_owned)
}
