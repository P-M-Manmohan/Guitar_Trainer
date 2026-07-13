use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};

use crate::AppState;

pub async fn analyze_practice(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> Response {
    let endpoint = format!(
        "{}/api/analyze-practice",
        state.config.ai_service_url.trim_end_matches('/')
    );
    let mut request = state.ai_client.post(endpoint).json(&payload);
    if !state.config.ai_service_key.is_empty() {
        request = request.header("x-api-key", &state.config.ai_service_key);
    }


    let response = match request.send().await {
        Ok(response) => response,
        Err(error) => {
            tracing::error!(err = %error, "ML practice request failed");
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({ "error": "ML service is unavailable" })),
            )
                .into_response();
        }
    };

    let status =
        StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let body = match response.json::<Value>().await {
    Ok(body) => body,
    Err(error) => {
        tracing::error!(err = %error, "ML service returned invalid JSON");
        return (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": "ML service returned an invalid response" })),
        )
            .into_response();
    }
};

tracing::info!("========== ML RESPONSE ==========");
tracing::info!("Status: {}", status);
tracing::info!(
    "Body:\n{}",
    serde_json::to_string_pretty(&body).unwrap()
);

(status, Json(body)).into_response()
    }
