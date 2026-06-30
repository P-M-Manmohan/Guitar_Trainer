use axum::{
    routing::get,
    Router,
};


use crate::{
    handlers::scales,
    AppState,
};

pub fn chord_router() -> Router<AppState> {
    Router::new()
        .route("/", get(|| async {"Hello"}))
        .route(
                "/scales/:root/major",
                get(scales::get_major_scale),
            )
        .route(
                "/scales/:root/minor",
                get(scales::get_minor_scale),
            )
}
