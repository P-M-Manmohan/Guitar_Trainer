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
    let mut body = match response.json::<Value>().await {
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

    if status.is_success() {
        if let Some(finger_placement) = body.get("finger_placement") {
            if let Ok(Some(matched_chord)) = crate::services::chord_service::match_chord(&state.db, finger_placement).await {
                if let Some(obj) = body.as_object_mut() {
                    obj.insert("predicted_chord".to_string(), json!(matched_chord));
                    obj.insert("chord_confidence".to_string(), json!(1.0));

                    let is_target_match = if let Some(target) = payload.get("target_chord").and_then(|v| v.as_str()) {
                        let normalize = |name: &str| -> String {
                            name.to_lowercase()
                                .replace(" ", "")
                                .replace("major", "")
                                .replace("maj", "")
                                .replace("minor", "m")
                                .replace("min", "m")
                        };
                        normalize(target) == normalize(&matched_chord)
                    } else {
                        false
                    };

                    let is_free_mode = payload.get("mode").and_then(|v| v.as_str()).map_or(true, |m| m == "free");

                    if is_free_mode || is_target_match {
                        obj.insert("status".to_string(), json!("recognized"));
                        obj.insert("raw_status".to_string(), json!("recognized"));
                        obj.insert("stable_status".to_string(), json!("recognized"));
                        obj.insert("overall_score".to_string(), json!(100));
                        obj.insert("placement_correct".to_string(), json!(true));
                        obj.insert("summary".to_string(), json!(format!("This is Chord {}.", matched_chord)));
                        obj.insert("instruction".to_string(), json!(format!("This is Chord {}.", matched_chord)));
                    }
                }
            }
        }
    }

    tracing::info!("========== ML RESPONSE ==========");
    tracing::info!("Status: {}", status);
    tracing::info!(
        "Body:\n{}",
        serde_json::to_string_pretty(&body).unwrap()
    );

    (status, Json(body)).into_response()
}
