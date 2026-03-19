use axum::{ Router, routing::get };
use crate::api::handlers;

pub fn create_routes() -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))

}
