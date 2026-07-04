use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Difficulty {
    Beginner,
    Intermediate,
    Advanced,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChordsVoicing {
    pub id: String,
    pub name: String, 

    pub difficulty: String,

    pub position: u8,   //first fret where the shape starts

    pub frets: [i8; 6], //0 -> open, -1 -> muted

    pub fingers: [u8; 6],

    pub barre: Option<Barre>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Barre {
    pub fret: u8,
    pub from_string: u8,
    pub to_string: u8,
}
