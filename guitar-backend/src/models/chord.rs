use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Chord {
    pub degree: String,
    pub symbol: String,
    pub name: String,
    pub quality: String,
    pub notes: Vec<String>,
}
