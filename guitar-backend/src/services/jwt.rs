use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use std::env;

use crate::errors::AppError;
use crate::models::jwt::Claims;



pub fn generate(user_id: i64) -> Result<String, AppError> {


    let jwt_secret = env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");

    let expiration = Utc::now() + Duration::days(7);

    let claims = Claims {
        sub: user_id,
        exp: expiration.timestamp() as usize,
    };

let token = encode(
    &Header::default(),
    &claims,
    &EncodingKey::from_secret(jwt_secret.as_bytes()),
)
.map_err(|e| AppError::Jwt(e.to_string()))?;
    Ok(token)
}

pub fn verify(token: &str) -> Result<Claims, AppError> {


    let jwt_secret = env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Jwt(e.to_string()))?;
    Ok(data.claims)
}
