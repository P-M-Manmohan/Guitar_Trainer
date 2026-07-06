use crate::{
    models::users::{SignupRequest, LoginRequest},
    AppState,
    errors::AppError,
    repositories::auth,
    services::jwt::generate,
};

use argon2::{
    Argon2,
    PasswordHash,
    PasswordHasher,
    PasswordVerifier,
};
use argon2::password_hash::{
    SaltString,
    rand_core::OsRng,
};


pub async fn signup(
    state: &AppState,
    req: SignupRequest,
) -> Result<String, AppError> {

    println!("services");

    if auth::find_by_email(&state.db, &req.email)
        .await?
        .is_some()
    {
        return Err(AppError::EmailAlreadyExists("Email Already Exist".to_string()));
    }


    let password_hash =
        hash_password(&req.password)?;

    let user =
        auth::create_user(
            &state.db,
            &req.username,
            &req.email,
            &password_hash,
        )
        .await?;

    let token =
        generate(user.id)?;

    Ok(token)
}

pub async fn login(
    state: &AppState,
    req: LoginRequest,
) -> Result<String, AppError> {

    let user =
        auth::find_by_email(
            &state.db,
            &req.email,
        )
        .await?
        .ok_or(AppError::InvalidCredentials("Credentials invalid".to_string()))?;

    verify_password(
        &req.password,
        &user.password_hash,
    )?;

    let token =
        generate(user.id)?;

    Ok(token)
}


pub fn hash_password(
    password: &str,
) -> Result<String, AppError> {

    let salt = SaltString::generate(&mut OsRng);

    Ok(
        Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::PasswordHash(e.to_string()))?
        .to_string()
    )
}


pub fn verify_password(
    password: &str,
    hash: &str,
) -> Result<(), AppError> {
let parsed_hash = PasswordHash::new(hash)
    .map_err(|_| AppError::InvalidCredentials("Invalid email or password".into()))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| {
            AppError::InvalidCredentials(
                "Invalid email or password".to_string(),
            )
        })?;

    Ok(())
}
