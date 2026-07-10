use sqlx::PgPool;

use crate::models::users::UserProfile;

pub async fn get_profile(
    pool: &PgPool,
    user_id: i64,
) -> Result<UserProfile, sqlx::Error> {

    sqlx::query_as!(
        UserProfile,
        r#"
        SELECT
            username,
            practice_time,
            lessons_completed
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(pool)
    .await
}

pub async fn add_practice_time(
    pool: &PgPool,
    user_id: i64,
    seconds: i64,
) -> Result<(), sqlx::Error> {

    sqlx::query!(
        r#"
        UPDATE users
        SET practice_time = practice_time + $1
        WHERE id = $2
        "#,
        seconds,
        user_id
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_lessons(
    pool: &PgPool,
    user_id: i64,
    change: i32,
    lesson_id: i64,
) -> Result<(), sqlx::Error> {
    // Only change the aggregate when the individual completion state changes.
    // This makes the frontend's on/off toggle idempotent and keeps the detail
    // endpoint and profile counter in sync.
    let changed = if change == 1 {
        sqlx::query!(
            r#"
            INSERT INTO lessons_completed (user_id, lesson_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
            user_id,
            lesson_id
        )
        .execute(pool)
        .await?
        .rows_affected()
    } else {
        sqlx::query!(
            "DELETE FROM lessons_completed WHERE user_id = $1 AND lesson_id = $2",
            user_id,
            lesson_id
        )
        .execute(pool)
        .await?
        .rows_affected()
    };

    if changed > 0 {
        sqlx::query!(
            r#"
            UPDATE users
            SET lessons_completed = GREATEST(lessons_completed + $1, 0)
            WHERE id = $2
            "#,
            change,
            user_id
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}
