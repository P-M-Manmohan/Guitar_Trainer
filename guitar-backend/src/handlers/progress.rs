use axum::{extract::{Query, State}, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::{errors::Result, middleware::auth::AuthUser, models::progress::DailyProgress, AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/progress/daily",   get(daily_progress))
        .route("/progress/summary", get(summary))
}

#[derive(Deserialize)]
pub struct DateRange {
    pub from: chrono::NaiveDate,
    pub to: chrono::NaiveDate,
}

pub async fn daily_progress(
    State(state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthUser>,
    Query(range): Query<DateRange>,
) -> Result<Json<Vec<DailyProgress>>> {
    // Aggregate by calendar day — good for graphing
    let rows = sqlx::query_as!(
        DailyProgress,
        r#"
        SELECT
            DATE(ps.started_at)           AS "date!",
            COUNT(DISTINCT ps.id)         AS "sessions!",
            AVG(er.accuracy_score)::double precision        AS "avg_accuracy?",
            COALESCE(SUM(ps.duration_secs) / 60, 0) AS "total_mins!"
        FROM practice_sessions ps
        LEFT JOIN exercise_results er ON er.session_id = ps.id
        WHERE ps.user_id = $1
          AND ps.started_at::date BETWEEN $2 AND $3
        GROUP BY DATE(ps.started_at)
        ORDER BY DATE(ps.started_at)
        "#,
        user.user_id,
        range.from,
        range.to,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

#[derive(Serialize)]
pub struct ProgressSummary {
    pub total_sessions: i64,
    pub total_mins: i64,
    pub avg_accuracy: Option<f64>,
    pub current_streak_days: i64,
    pub best_chord: Option<String>,
}

pub async fn summary(
    State(state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthUser>,
) -> Result<Json<ProgressSummary>> {
    let totals = sqlx::query!(
        r#"
        SELECT
            COUNT(DISTINCT ps.id)                        AS "total_sessions!",
            COALESCE(SUM(ps.duration_secs) / 60, 0)     AS "total_mins!",
            AVG(er.accuracy_score)::double precision    AS "avg_accuracy?"
        FROM practice_sessions ps
        LEFT JOIN exercise_results er ON er.session_id = ps.id
        WHERE ps.user_id = $1
        "#,
        user.user_id
    )
    .fetch_one(&state.db)
    .await?;

    // Streak: consecutive days with at least one completed session
    let streak = sqlx::query_scalar!(
        r#"
        WITH daily AS (
            SELECT DISTINCT DATE(started_at) AS day
            FROM practice_sessions
            WHERE user_id = $1 AND ended_at IS NOT NULL
        ),
        numbered AS (
            SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn FROM daily
        )
        SELECT COUNT(*) AS "streak!"
        FROM numbered
        WHERE day = CURRENT_DATE - (rn - 1) * INTERVAL '1 day'
        "#,
        user.user_id
    )
    .fetch_one(&state.db)
    .await?;

    // Best chord: highest avg accuracy
    let best_chord = sqlx::query_scalar!(
        r#"
        SELECT c.name
        FROM exercise_results er
        JOIN chord_voicings cv ON cv.id = er.chord_voicing_id
        JOIN chords c ON c.id = cv.chord_id
        JOIN practice_sessions ps ON ps.id = er.session_id
        WHERE ps.user_id = $1
        GROUP BY c.name
        ORDER BY AVG(er.accuracy_score) DESC
        LIMIT 1
        "#,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await?;

    Ok(Json(ProgressSummary {
        total_sessions: totals.total_sessions,
        total_mins: totals.total_mins,
        avg_accuracy: totals.avg_accuracy,
        current_streak_days: streak,
        best_chord,
    }))
}
