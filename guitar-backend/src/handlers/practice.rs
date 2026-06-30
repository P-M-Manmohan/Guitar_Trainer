/*use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    errors::{AppError, Result},
    middleware::auth::AuthUser,
    models::practice::{ExerciseResult, PracticeSession},
    models::vision_analysis::HandLandmarks,
    services::vision,
    AppState,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/practice/sessions",              post(start_session))
        .route("/practice/sessions/:id/end",      post(end_session))
        .route("/practice/sessions/:id/exercises",post(submit_exercise))
        .route("/practice/sessions/:id",          get(get_session))
}

// ── Start session ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct StartSessionResponse {
    pub session_id: Uuid,
}

pub async fn start_session(
    State(state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthUser>,
) -> Result<Json<StartSessionResponse>> {
    let session_id = sqlx::query_scalar!(
        "INSERT INTO practice_sessions (user_id) VALUES ($1) RETURNING id",
        user.user_id
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(StartSessionResponse { session_id }))
}

// ── End session ───────────────────────────────────────────────────────────────

pub async fn end_session(
    State(state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthUser>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<PracticeSession>> {
    let session = sqlx::query_as!(
        PracticeSession,
        r#"
        UPDATE practice_sessions
        SET ended_at = NOW(),
            duration_secs = EXTRACT(EPOCH FROM (NOW() - started_at))::int
        WHERE id = $1 AND user_id = $2
        RETURNING *
        "#,
        session_id,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("session not found".into()))?;

    Ok(Json(session))
}

// ── Submit exercise result ────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SubmitExerciseRequest {
    pub chord_voicing_id: Uuid,
    pub hand_landmarks: Option<HandLandmarks>,
    pub timing_score: Option<i32>,
    pub pitch_score: Option<i32>,
}

pub async fn submit_exercise(
    State(state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthUser>,
    Path(session_id): Path<Uuid>,
    Json(body): Json<SubmitExerciseRequest>,
) -> Result<Json<ExerciseResult>> {
    // Verify session belongs to user
    let session_exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM practice_sessions WHERE id = $1 AND user_id = $2)",
        session_id,
        user.user_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !session_exists {
        return Err(AppError::NotFound("session not found".into()));
    }

    // Fetch expected finger positions for the voicing
    let finger_positions = sqlx::query_as!(
        crate::models::FingerPosition,
        r#"
        SELECT id, voicing_id, string_num, fret, finger, is_barre, barre_span
        FROM finger_positions
        WHERE voicing_id = $1
        ORDER BY string_num
        "#,
        body.chord_voicing_id
    )
    .fetch_all(&state.db)
    .await?;

    // Score vision if landmarks provided
    let (accuracy_score, feedback_json) = if let Some(landmarks) = &body.hand_landmarks {
        let score = vision::score_hand_against_voicing(landmarks, &finger_positions);
        let json = serde_json::to_value(&score).ok();
        (score.overall_score, json)
    } else {
        (0, None)
    };

    let result = sqlx::query_as!(
        ExerciseResult,
        r#"
        INSERT INTO exercise_results
            (session_id, chord_voicing_id, accuracy_score, timing_score, pitch_score, feedback_json)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
        session_id,
        body.chord_voicing_id,
        accuracy_score,
        body.timing_score,
        body.pitch_score,
        feedback_json,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(result))
}

// ── Get session ───────────────────────────────────────────────────────────────

pub async fn get_session(
    State(state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthUser>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<PracticeSession>> {
    let session = sqlx::query_as!(
        PracticeSession,
        "SELECT * FROM practice_sessions WHERE id = $1 AND user_id = $2",
        session_id,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("session not found".into()))?;

    Ok(Json(session))
}
*/
