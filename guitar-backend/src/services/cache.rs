use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use crate::{db::RedisPool, errors::Result};

// Generic cache-aside helper.
// Usage:
//   let lessons = cache::get_or_set(&mut redis, "lessons:all", 300, || async {
//       db_fetch_lessons(&db).await
//   }).await?;

pub async fn get_or_set<T, F, Fut>(
    redis: &mut RedisPool,
    key: &str,
    ttl_secs: u64,
    fetch: F,
) -> Result<T>
where
    T: Serialize + DeserializeOwned,
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T>>,
{
    // Try cache first
    if let Ok(cached) = redis.get::<_, String>(key).await {
        if let Ok(value) = serde_json::from_str::<T>(&cached) {
            return Ok(value);
        }
    }

    // Cache miss — fetch from DB
    let value = fetch().await?;
    let serialized = serde_json::to_string(&value)
        .map_err(|e| crate::errors::AppError::Internal(anyhow::anyhow!("serialize: {e}")))?;

    let _: () = redis.set_ex(key, serialized, ttl_secs).await.unwrap_or(());

    Ok(value)
}

pub async fn invalidate(redis: &mut RedisPool, key: &str) -> Result<()> {
    let _: () = redis.del(key).await?;
    Ok(())
}

pub async fn invalidate_pattern(redis: &mut RedisPool, pattern: &str) -> Result<()> {
    let keys: Vec<String> = redis.keys(pattern).await?;
    if !keys.is_empty() {
        let _: () = redis.del(keys).await?;
    }
    Ok(())
}
