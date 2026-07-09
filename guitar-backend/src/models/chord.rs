use core::option::Option;

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

    pub diagram: String,
}

#[derive(Debug, Serialize)]
pub struct ChordShape {

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

pub struct ParsedChord {
    pub frets: Vec<Option<u8>>,
    pub fingers: Vec<Option<u8>>,
    pub barres: Vec<u8>,
    pub start_fret: u8,
}

pub struct Barre {
    pub fret: u8,
    pub from_string: usize,
    pub to_string: usize,
}
