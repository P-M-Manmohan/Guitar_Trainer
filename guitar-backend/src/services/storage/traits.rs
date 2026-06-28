use async_trait::async_trait;

use super::types::*;

#[async_trait]
pub trait Storage: Send + Sync {
    async fn upload(
            &self,
            file: UploadFile,
    ) -> anyhow::Result<StoredFile>;

    async fn delete(
        &self,
        key: &str,
    ) -> anyhow::Result<()>;

    async fn download(
            &self,
            key: &str,
        ) -> anyhow::Result<Vec<u8>>;
}
