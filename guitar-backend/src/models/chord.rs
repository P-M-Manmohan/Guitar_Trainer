use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Chord {
    pub degree: String,
    pub symbol: String,
    pub name: String,
    pub quality: String,
    pub notes: Vec<String>,
}


#[derive(Debug, Serialize)]
pub struct ChordPosition {
    pub position_index: i32,

    pub frets: String,

    pub fingers: String,

    pub barres: Option<i32>,

    pub capo: bool,
}

#[derive(Debug, Serialize)]
pub struct ChordResponse {
    pub key: String,

    pub suffix: String,

    pub positions: Vec<ChordPosition>,
}
