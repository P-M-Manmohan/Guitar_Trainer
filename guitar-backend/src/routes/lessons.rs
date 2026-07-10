use axum::{
    routing::{post, get},
    Router,
};

use crate::handlers::{user, lessons};

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
        .route(
                "/lessons/:id/comp", 
                post(user::lesson_complete),
            )
}


