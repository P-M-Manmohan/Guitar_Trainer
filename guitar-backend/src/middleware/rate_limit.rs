use axum::{body::Body, extract::{ConnectInfo, Request, State}, middleware::Next, response::Response};
use std::net::SocketAddr;
use crate::{errors::AppError, AppState};

// Sliding-window rate limit stored in Redis.
// Key: "rl:{ip}"  Value: request count  TTL: 60s
// Allows config.rate_limit_rps requests per second (enforced per minute bucket).

pub async fn rate_limit(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let ip = addr.ip().to_string();
    let key = format!("rl:{ip}");
    let limit = (state.config.rate_limit_rps * 60) as i64; // requests per minute

    let mut redis = state.redis.clone();

    // INCR + EXPIRE in a pipeline — atomic enough for rate limiting
    let count: i64 = redis::pipe()
        .incr(&key, 1)
        .expire(&key, 60)
        .ignore()
        .query_async(&mut redis)
        .await
        .map_err(AppError::Redis)?;

    if count > limit {
        return Err(AppError::RateLimited);
    }

    Ok(next.run(req).await)
}
