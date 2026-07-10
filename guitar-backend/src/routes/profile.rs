use axum::{
    routing::{post,get},
    Router,
};

use crate::handlers::user;

use crate::{
    AppState,
};

pub fn profile_router() -> Router<AppState> {
    Router::new()
        .route(
                "/user/profile",
                get(user::profile),
            )
        .route(
                "/practice/time",
                post(user::practice_time),
            )
}

