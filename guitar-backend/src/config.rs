use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    // Server
    pub port: u16,
    pub environment: String,         // "development" | "production"

    // Database
    pub database_url: String,
    pub db_pool_max: u32,            // e.g. 20 per instance

    // Redis
    pub redis_url: String,

    // JWT
    pub jwt_secret: String,
    pub jwt_expiry_secs: u64,        // e.g. 86400 (24h)
    pub refresh_token_expiry_secs: u64,

    // S3 / Cloudflare R2
    pub s3_bucket: String,
    pub s3_region: String,
    pub s3_endpoint: Option<String>, // set this for R2: https://<account>.r2.cloudflarestorage.com
    pub aws_access_key_id: String,
    pub aws_secret_access_key: String,

    // AI Service
    pub ai_service_url: String,
    pub ai_service_key: String,

    // Rate limiting (requests per second per IP)
    pub rate_limit_rps: u32,
}

impl AppConfig {
    pub fn load() -> anyhow::Result<Self> {
        let cfg = config::Config::builder()
            .add_source(config::Environment::default().separator("__"))
            .set_default("port", 8080)?
            .set_default("environment", "development")?
            .set_default("db_pool_max", 20)?
            .set_default("jwt_expiry_secs", 86400)?
            .set_default("refresh_token_expiry_secs", 2_592_000)? // 30 days
            .set_default("rate_limit_rps", 60)?
            .set_default("ai_service_url", "http://127.0.0.1:8000")?
            .set_default("ai_service_key", "")?
            .build()?;

        Ok(cfg.try_deserialize()?)
    }

    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }
}
