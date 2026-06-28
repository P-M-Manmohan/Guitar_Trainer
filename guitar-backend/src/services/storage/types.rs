use std::path::PathBuf;

pub struct UploadFile {
    pub path: PathBuf,
    pub bytes: Vec<u8>,
    pub content_type: String,
}

pub struct StoredFile {
    pub url: String,
    pub key: String,
}

pub struct DownloadFile {
    pub bytes: Vec<u8>,
    pub content_type: String,
}
