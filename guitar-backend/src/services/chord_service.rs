use sqlx::PgPool;

use crate::{
    models::chord::ChordResponse,
    repositories::chord_repository,
};

pub async fn get_chord(
        pool: &PgPool,
        key: &str,
        suffix: &str,
    ) -> Result<Option<ChordResponse>, sqlx::Error> {
        
    chord_repository::get_chord(
            pool,
            key,
            suffix,
        )
        .await
}
