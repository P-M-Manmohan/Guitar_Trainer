use std::path::{Path, PathBuf};

use anyhow::Result;
use async_trait::async_trait;
use tokio::fs;


use super::{
    Storage,
    UploadFile,
    StoredFile,
};

pub struct LocalStorage {
    root: PathBuf,
}

impl LocalStorage {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
        }
    }

    fn full_path(&self, key: &Path) -> PathBuf {
        self.root.join(key)
    }
}

#[async_trait]
impl Storage for LocalStorage{
    async fn upload(
            &self,
            file: UploadFile,
        ) -> Result<StoredFile> {
            let full_path = self.full_path(&file.path);

            if let Some(parent) = full_path.parent() {
                fs::create_dir_all(parent).await?;
            }

            fs::write(&full_path, file.bytes).await?;

            Ok(StoredFile {
                key: file.path.to_string_lossy().into_owned(),
                url:format!("/{}", file.path.display()),
            })
    }

    async fn download(
            &self,
            key: &str,
        ) -> Result<Vec<u8>> {
        Ok(
            fs::read(
                    self.full_path(Path::new(key))
                ).await?
        )
    }

    async fn delete(
            &self,
            key: &str,
        ) -> Result<()> {
            fs::remove_file(
                self.full_path(Path::new(key))
            ).await?;

            Ok(())
    }
}
