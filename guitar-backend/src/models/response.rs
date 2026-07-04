use serde::{Serialize, Deserialize};

use super::{chord::Chord, scale::Scale};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScaleResponse {
    pub scale: Scale,
    pub chords: Vec<Chord>,
}

