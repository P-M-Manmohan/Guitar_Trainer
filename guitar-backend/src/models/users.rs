// models/user.rs

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct SignupRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub password_hash: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
}

#[derive(Serialize)]
pub struct UserProfile {
    pub username: String,
    pub practice_time: i64,
    pub lessons_completed: i32,
}

#[derive(Deserialize)]
pub struct PracticeTimeRequest {
    pub seconds: i64,
}

#[derive(Deserialize)]
pub struct LessonCompletionRequest {
    pub complete: i32,
}
