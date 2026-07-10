use axum::{routing::post, Router};

use crate::{handlers::ml, AppState};

pub fn ml_router() -> Router<AppState> {
    Router::new().route("/ml/analyze-practice", post(ml::analyze_practice))
}
