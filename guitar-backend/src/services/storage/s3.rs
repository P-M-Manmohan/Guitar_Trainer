use anyhow::Result;
use async_trait::async_trait;

use aws_sdk_s3::{
    primitives::ByteStream,
    Client,
};

use super::{
    Storage,
    UploadFile,
    StoredFile,
};


pub struct S3storage {
    client:Client,
    bucket:String,
}

impl S3storage {
    
    pub fn new(
        client: Client,
        bucket: impl Into<String>,
    ) -> Self {
        
        Self {
            client,
            bucket: bucket.into(),
        }
    }
}

#[async_trait]
impl Storage for S3storage {
    
    async fn upload(
            &self,
            file: UploadFile,
        ) -> Result<StoredFile> {
            
            let key = file.path.to_string_lossy().into_owned();

            self.client
                .put_object()
                .bucket(&self.bucket)
                .key(&key)
                .body(ByteStream::from(file.bytes))
                .content_type(file.content_type)
                .send()
                .await?;

            Ok(
                StoredFile {
                    url: format! {
                        "https://{}.s3.amazonaws.com/{}",
                        self.bucket,
                        key,
                    },
                key,
            }
        )
    }
    
    async fn download(
            &self,
            key: &str,
        ) -> Result<Vec<u8>>{
        
        let object = self.client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;

        let bytes = object
            .body
            .collect()
            .await?
            .into_bytes();

            Ok(bytes.to_vec())
    }

    async fn delete(
            &self,
            key: &str,
        ) -> Result <()> {
            self.client
                .delete_object()
                .bucket(&self.bucket)
                .key(key)
                .send()
                .await?;

            Ok(())
    }

}
