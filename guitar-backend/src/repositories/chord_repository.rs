use sqlx::PgPool;

use crate::models::chord::{
    ChordPosition,
    ChordResponse,
    ChordShape
};

use crate::services::diagram::render_chord;

//use crate::services::renderer::render_diagram;

pub async fn get_chord(
        pool: &PgPool,
        key: &str,
        suffix: &str,
    ) -> Result<Option<ChordResponse>, sqlx::Error> {
    
    let chord = sqlx::query!(
            r#"
                SELECT
                    id,
                    key,
                    suffix
                    FROM chords 
                    WHERE key = $1
                    and suffix = $2
                    "#,
                    key,
                    suffix
        )
        .fetch_optional(pool)
        .await?;

        let Some(chord) = chord else {
            return Ok(None);
        };

        let rows = sqlx::query!(
                r#"
                SELECT
                    position_index,
                    frets,
                    fingers,
                    barres,
                    capo
                FROM chord_positions
                WHERE chord_id = $1
                ORDER BY position_index
                "#,
                chord.id
            )
            .fetch_all(pool)
            .await?;



        let positions = rows
            .into_iter()
            .map(|row| ChordPosition {
                position_index: row.position_index,
                frets: row.frets.clone(),
                fingers: row.fingers.clone(),
                barres: row.barres,
                capo:row.capo,
                diagram: render_chord(
                    &ChordShape{
                        frets: row.frets,
                        fingers: row.fingers,
                        barres: row.barres,
                        capo:row.capo,
                    })
            })
            .collect();

        Ok(Some(ChordResponse {
            key: chord.key,
            suffix: chord.suffix,
            positions,
        }))
}

pub async fn match_chord_shape(
    pool: &PgPool,
    fingers_pattern: &str,
    frets_pattern: &str,
) -> Result<Vec<(String, String, String, String)>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT c.key, c.suffix, cp.frets, cp.fingers
        FROM chord_positions cp
        JOIN chords c ON cp.chord_id = c.id
        WHERE cp.fingers LIKE $1 AND cp.frets LIKE $2
        "#,
        fingers_pattern,
        frets_pattern
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| (row.key, row.suffix, row.frets, row.fingers))
        .collect())
}
