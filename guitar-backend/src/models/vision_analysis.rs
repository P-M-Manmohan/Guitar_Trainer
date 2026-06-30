use serde::Deserialize;


#[derive(Debug, Deserialize)]
pub struct LandmarkPoint {
    pub x: f32,
    pub y: f32,
    pub z: Option<f32>,
}

#[derive(Debug, Deserialize)]
pub struct HandLandmarks {
    pub left_hand: Option<Vec<LandmarkPoint>>,
    pub right_hand: Option<Vec<LandmarkPoint>>,
}


