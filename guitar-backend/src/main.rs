use std::sync::Arc;
use axum::{Router, middleware as axum_middleware};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod config;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod services;
mod music;
mod repositories;
mod routes;

use config::AppConfig;
use db::{Database, RedisPool};
use crate::middleware as mw;
use crate::services::storage::{LocalStorage, Storage};

// ── AppState ─────────────────────────────────────────────────────────────────
// Cloned cheaply via Arc on every request. Add new shared resources here.
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub redis: RedisPool,
    pub config: Arc<AppConfig>,
    pub s3: Arc<dyn Storage>,
}

// ── main ─────────────────────────────────────────────────────────────────────
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env then environment
    dotenvy::dotenv().ok();

    // Structured JSON logging in production, pretty in dev
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,guitar_backend=debug".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let config = Arc::new(AppConfig::load()?);

    tracing::info!(version = env!("CARGO_PKG_VERSION"), "starting guitar backend");

    // ── Connections ───────────────────────────────────────────────────────────
    let db = db::connect(&config.database_url, config.db_pool_max).await?;
    let redis = db::connect_redis(&config.redis_url).await?;
    //let s3 = if config.is_production() {
    //    Some(Arc::new(db::connect_s3(&config).await?))
    //}else{
    //    None
    //};
    let s3: Arc<dyn Storage> =
    Arc::new(LocalStorage::new("./uploads"));

    // Run pending migrations on startup
    sqlx::migrate!("./migrations").run(&db).await?;
    tracing::info!("migrations applied");

    let state = AppState { db, redis, config: config.clone(), s3 };

    // ── Router ────────────────────────────────────────────────────────────────
    //
    let app = Router::new()
    .merge(routes::chord::chord_router())
    .layer(axum_middleware::from_fn_with_state(
        state.clone(),
        mw::auth::optional_auth,
    ))
    .with_state(state);

    /*
    let app = Router::new()
        .merge(routes::chord::chord_router())
        .layer(axum_middleware::from_fn_with_state(state.clone(), mw::auth::optional_auth))
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024)) // 10 MB
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(());
    */

    // ── Listen ────────────────────────────────────────────────────────────────
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(addr, "listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.expect("ctrl-c handler") };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("shutdown signal received");
}
