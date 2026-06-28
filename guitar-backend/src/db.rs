use sqlx::{postgres::PgPoolOptions, PgPool};
use redis::aio::ConnectionManager;
use std::time::Duration;
use aws_sdk_s3::config::Region;

pub type Database = PgPool;
pub type RedisPool = ConnectionManager;

// ── Postgres ──────────────────────────────────────────────────────────────────
// Pool size guideline:
//   - Each Postgres connection uses ~5 MB RAM on the server.
//   - For 10k concurrent users, you typically run 4–8 backend instances
//     each with pool_max=20, behind a PgBouncer in transaction mode.
//   - PgBouncer multiplexes those into far fewer actual Postgres connections.
pub async fn connect(database_url: &str, pool_max: u32) -> anyhow::Result<Database> {
    let pool = PgPoolOptions::new()
        .max_connections(pool_max)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(database_url)
        .await?;

    // Verify connectivity
    sqlx::query("SELECT 1").execute(&pool).await?;
    tracing::info!(pool_max, "postgres connected");

    Ok(pool)
}

// ── Redis ─────────────────────────────────────────────────────────────────────
// Used for: JWT refresh token store, session cache, rate limit counters,
// leaderboard data, and short-lived practice session state.
pub async fn connect_redis(redis_url: &str) -> anyhow::Result<RedisPool> {
    let client = redis::Client::open(redis_url)?;
    let manager = ConnectionManager::new(client).await?;
    tracing::info!("redis connected");
    Ok(manager)
}

// ── S3 / Cloudflare R2 ───────────────────────────────────────────────────────
pub async fn connect_s3(config: &crate::config::AppConfig) -> anyhow::Result<aws_sdk_s3::Client> {
    let creds = aws_sdk_s3::config::Credentials::new(
        &config.aws_access_key_id,
        &config.aws_secret_access_key,
        None, None,
        "guitar-backend",
    );

    let mut builder = aws_sdk_s3::Config::builder()
        .region(Region::new(config.s3_region.clone()))
        .credentials_provider(creds)
        .force_path_style(true); // required for R2

    // R2 custom endpoint
    if let Some(endpoint) = &config.s3_endpoint {
        builder = builder.endpoint_url(endpoint);
    }

    let client = aws_sdk_s3::Client::from_conf(builder.build());
    tracing::info!(bucket = %config.s3_bucket, "S3/R2 client ready");
    Ok(client)
}
