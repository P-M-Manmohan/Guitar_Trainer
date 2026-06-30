/*use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    errors::{AppError, Result},
    //models::{Chord, ChordVoicing, FingerPosition},
    services::cache,
    AppState,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/chords",                              get(list_chords))
        .route("/chords/:id/voicings",                 get(voicings_for_chord))
        .route("/chords/voicings/:voicing_id/fingers", get(finger_positions))
}

#[derive(Deserialize)]
pub struct ChordFilter {
    pub tuning_id: Option<Uuid>,
    pub quality: Option<String>,   // "major", "minor", "7" etc.
    pub difficulty: Option<i32>,
    pub tag: Option<String>,
}

//pub async fn list_chords(
//    State(state): State<AppState>,
//    Query(filter): Query<ChordFilter>,
//) -> Result<Json<Vec<Chord>>> {
    // Cache the full chord list for 10 min (it's seed data, rarely changes)
//    let mut redis = state.redis.clone();
//    let cache_key = "chords:all";

//    if filter.tuning_id.is_none() && filter.quality.is_none()
//        && filter.difficulty.is_none() && filter.tag.is_none()
//    {
//        let chords = cache::get_or_set(&mut redis, cache_key, 600, || async {
//            Ok(sqlx::query_as!(Chord, "SELECT * FROM chords ORDER BY name")
//                .fetch_all(&state.db)
//                .await?)
//        })
//        .await?;
//        return Ok(Json(chords));
//    }

    // Filtered query
//    let chords = sqlx::query_as!(
//        Chord,
/*
        r#"
        SELECT DISTINCT c.*
        FROM chords c
        LEFT JOIN chord_voicings cv ON cv.chord_id = c.id
        LEFT JOIN chord_tags ct ON ct.voicing_id = cv.id
        WHERE ($1::uuid IS NULL OR cv.tuning_id = $1)
          AND ($2::text IS NULL OR c.quality = $2)
         AND ($3::int IS NULL OR cv.difficulty = $3)
         AND ($4::text IS NULL OR ct.tag = $4)
        ORDER BY c.name
        "#,
        */

//        filter.tuning_id,
//        filter.quality,
//        filter.difficulty,
//        filter.tag,
//    )
//    .fetch_all(&state.db)
//    .await?;

//    Ok(Json(chords))
//}
/*
pub async fn voicings_for_chord(
    State(state): State<AppState>,
    Path(chord_id): Path<Uuid>,
    Query(filter): Query<ChordFilter>,
) -> Result<Json<Vec<ChordVoicing>>> {
    let voicings = sqlx::query_as!(
        ChordVoicing,
        r#"
        SELECT cv.*
        FROM chord_voicings cv
        WHERE cv.chord_id = $1
          AND ($2::uuid IS NULL OR cv.tuning_id = $2)
          AND ($3::int IS NULL OR cv.difficulty <= $3)
        ORDER BY cv.difficulty, cv.base_fret
        "#,
        chord_id,
        filter.tuning_id,
        filter.difficulty,
    )
    .fetch_all(&state.db)
    .await?;

    if voicings.is_empty() {
        return Err(AppError::NotFound("no voicings found for this chord".into()));
    }

    Ok(Json(voicings))
}

pub async fn finger_positions(
    State(state): State<AppState>,
    Path(voicing_id): Path<Uuid>,
) -> Result<Json<Vec<FingerPosition>>> {
    let positions = sqlx::query_as!(
        FingerPosition,
        r#"
        SELECT * FROM finger_positions
        WHERE voicing_id = $1
        ORDER BY string_num
        "#,
        voicing_id
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(positions))
}

AND*/

*/
