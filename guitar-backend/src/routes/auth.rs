use axum::{
    routing::post,
    Router,
};

use crate::handlers::auth;

use crate::{
    AppState,
};

pub fn auth_router() -> Router<AppState> {
    Router::new()
        .route(
                "/auth/login",
                post(auth::login),
            )
        .route(
                "/auth/signup",
                post(auth::signup),
        )
}
