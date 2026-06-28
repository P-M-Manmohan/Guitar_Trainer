use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use redis::AsyncCommands;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    db::RedisPool,
    errors::{AppError, Result},
    middleware::auth::{Claims, TokenType},
};

// ── Password ──────────────────────────────────────────────────────────────────

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("hash error: {e}")))
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    let parsed = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("hash parse: {e}")))?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
}

// ── JWT ───────────────────────────────────────────────────────────────────────

pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

pub fn issue_token_pair(
    user_id: Uuid,
    email: &str,
    config: &AppConfig,
) -> Result<TokenPair> {
    let now = Utc::now().timestamp() as u64;
    let key = EncodingKey::from_secret(config.jwt_secret.as_bytes());

    let access = encode(
        &Header::default(),
        &Claims {
            sub: user_id,
            email: email.to_owned(),
            exp: now + config.jwt_expiry_secs,
            iat: now,
            token_type: TokenType::Access,
        },
        &key,
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("jwt encode: {e}")))?;

    let refresh = encode(
        &Header::default(),
        &Claims {
            sub: user_id,
            email: email.to_owned(),
            exp: now + config.refresh_token_expiry_secs,
            iat: now,
            token_type: TokenType::Refresh,
        },
        &key,
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("jwt encode: {e}")))?;

    Ok(TokenPair {
        access_token: access,
        refresh_token: refresh,
        expires_in: config.jwt_expiry_secs,
    })
}

// ── Refresh token Redis store ─────────────────────────────────────────────────
// Stores refresh tokens in Redis so we can invalidate them on logout.
// Key: "rt:{user_id}:{jti}"  TTL: refresh_token_expiry_secs

pub async fn store_refresh_token(
    redis: &mut RedisPool,
    user_id: Uuid,
    token: &str,
    expiry: u64,
) -> Result<()> {
    let key = format!("rt:{user_id}:{token}");
    let _: () = redis.set_ex(key, 1u8, expiry).await?;
    Ok(())
}

pub async fn revoke_refresh_token(redis: &mut RedisPool, user_id: Uuid, token: &str) -> Result<()> {
    let key = format!("rt:{user_id}:{token}");
    let _: () = redis.del(key).await?;
    Ok(())
}

pub async fn refresh_token_is_valid(
    redis: &mut RedisPool,
    user_id: Uuid,
    token: &str,
) -> Result<bool> {
    let key = format!("rt:{user_id}:{token}");
    let exists: bool = redis.exists(key).await?;
    Ok(exists)
}
