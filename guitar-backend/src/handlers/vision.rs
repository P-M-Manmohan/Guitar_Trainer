/*use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    errors::Result,
    middleware::auth::AuthUser,
    models:: vision_analysis::HandLandmarks,
    services::vision,
    AppState,
};

pub fn routes() -> Router<AppState> {
    Router::new().route("/vision/analyze", post(analyze))
}

#[derive(Deserialize)]
pub struct VisionAnalyzeRequest {
    pub voicing_id: Uuid,
    pub hand_landmarks: HandLandmarks,
}

//pub async fn analyze(
//    State(state): State<AppState>,
//    axum::Extension(_user): axum::Extension<AuthUser>,
//    Json(body): Json<VisionAnalyzeRequest>,
//) -> Result<Json<vision::VisionScore>> {
//    let positions = sqlx::query_as!(
//        FingerPosition,
//        "SELECT * FROM finger_positions WHERE voicing_id = $1 ORDER BY string_num",
//        body.voicing_id
//    )
//    .fetch_all(&state.db)
//    .await?;
//
//    let score = vision::score_hand_against_voicing(&body.hand_landmarks, &positions);
//    Ok(Json(score))
//}
//
*/
