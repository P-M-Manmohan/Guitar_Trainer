use sqlx::PgPool;

use crate::models::chord::{
    ChordPosition,
    ChordResponse,
};

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

        println!("{:?}",rows);


        let positions = rows
            .into_iter()
            .map(|row| ChordPosition {
                position_index: row.position_index,
                frets: row.frets,
                fingers: row.fingers,
                barres: row.barres,
                capo:row.capo,
                diagram: None
            })
            .collect();

        Ok(Some(ChordResponse {
            key: chord.key,
            suffix: chord.suffix,
            positions,
        }))
}
