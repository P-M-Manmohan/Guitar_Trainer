use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Scale{
    pub root: String,
    pub scale_type: String,
    pub notes: Vec<String>,
}
