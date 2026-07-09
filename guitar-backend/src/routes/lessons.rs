use axum::{
    routing::get,
    Router,
};

use crate::handlers::lessons;

use crate::{
    AppState,
};

pub fn lessons_router() -> Router<AppState> {
    Router::new()
        .route(
                "/lessons",
                get(lessons::get_lesson_summary),
            )
        .route(
                "/lessons/:id",
                get(lessons::get_lesson),
            )
}


