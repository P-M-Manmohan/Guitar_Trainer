use axum::{
    extract::Path,
    Json,
};

use crate::{
    models::response::ScaleResponse,
    services::scale_service,
};

pub async fn get_major_scale(
    Path(root): Path<String>,
) -> Json<ScaleResponse> {
    Json(
        scale_service::get_major_scale(&root)
    )
}

pub async fn get_minor_scale(
    Path(root): Path<String>,
    ) -> Json<ScaleResponse> {
    Json(
            scale_service::get_minor_scale(&root)
        )
}


