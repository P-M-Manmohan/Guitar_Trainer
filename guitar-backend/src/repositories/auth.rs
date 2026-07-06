use sqlx::PgPool;
use crate::models::users::User;

pub async fn create_user(
    db: &PgPool,
    username: &str,
    email: &str,
    password_hash: &str,
) -> Result<User, sqlx::Error> {
    println!("creating user");

    sqlx::query_as!(
        User,
        r#"
        INSERT INTO users
        (
            username,
            email,
            password_hash
        )
        VALUES
        ($1,$2,$3)

        RETURNING
            id,
            username,
            email,
            password_hash
        "#,
        username,
        email,
        password_hash,
    )
    .fetch_one(db)
    .await
}

pub async fn find_by_email(
    db: &PgPool,
    email: &str,
) -> Result<Option<User>, sqlx::Error> {

    sqlx::query_as!(
        User,
        r#"
        SELECT
            id,
            username,
            email,
            password_hash
        FROM users
        WHERE email = $1
        "#,
        email,
    )
    .fetch_optional(db)
    .await
}
