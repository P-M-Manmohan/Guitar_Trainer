use axum::{
    extract::{Path, State},
    Json,
};

use crate::{
    services::chord_service,
    AppState,
};

pub async fn get_chord(
        State(state): State<AppState>,
        Path((key, suffix)): Path<(String, String)>,
    ) -> Result<Json<crate::models::chord::ChordResponse>, axum::http::StatusCode> {
    
    let chord = chord_service::get_chord(
            &state.db,
            &key,
            &suffix,
        )   
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let Some(chord) = chord else {
            return Err(axum::http::StatusCode::NOT_FOUND);
        };

        Ok(Json(chord))
}
