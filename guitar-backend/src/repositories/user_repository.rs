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
) -> Result<(), sqlx::Error> {

    sqlx::query!(
        r#"
        UPDATE users
        SET lessons_completed =
            GREATEST(lessons_completed + $1, 0)
        WHERE id = $2
        "#,
        change,
        user_id
    )
    .execute(pool)
    .await?;

    Ok(())
}
