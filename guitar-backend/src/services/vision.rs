use crate::{
    errors::Result,
    models::{FingerPosition, HandLandmarks, LandmarkPoint},
};

// MediaPipe returns 21 landmarks per hand.
// We care about fingertips (4,8,12,16,20) and MCP joints (5,9,13,17)
// to infer which fret each finger is pressing.

const TIP_INDICES: [usize; 4] = [8, 12, 16, 20]; // index, middle, ring, pinky
const MCP_INDICES: [usize; 4] = [5, 9, 13, 17];

#[derive(serde::Serialize)]
pub struct VisionScore {
    pub overall_score: i32,         // 0–100
    pub per_finger: Vec<FingerFeedback>,
    pub summary: String,
}

#[derive(serde::Serialize)]
pub struct FingerFeedback {
    pub finger: String,
    pub correct: bool,
    pub message: Option<String>,
}

pub fn score_hand_against_voicing(
    landmarks: &HandLandmarks,
    expected: &[FingerPosition],
) -> VisionScore {
    let hand = match landmarks.right_hand.as_ref().or(landmarks.left_hand.as_ref()) {
        Some(h) if h.len() == 21 => h,
        _ => return fallback_score("no hand detected"),
    };

    let mut correct_count = 0usize;
    let mut per_finger: Vec<FingerFeedback> = Vec::new();

    for fp in expected {
        let finger_name = fp.finger.as_str();
        let tip_idx = finger_index(finger_name);

        if let Some(tip_idx) = tip_idx {
            let tip = &hand[tip_idx];
            let mcp = &hand[MCP_INDICES[tip_idx.saturating_sub(8) / 4]];

            // Heuristic: if tip y is significantly above MCP y,
            // finger is likely pressing. Threshold tuned empirically.
            let is_pressing = tip.y < mcp.y - 0.04;

            // Rough fret estimation from x coordinate normalized 0→1 across fretboard.
            // In production, calibrate this against known reference points.
            let estimated_fret = ((tip.x - 0.1) * 20.0).round() as i32;
            let fret_diff = (estimated_fret - fp.fret).abs();

            let correct = is_pressing && fret_diff <= 1;
            if correct { correct_count += 1; }

            per_finger.push(FingerFeedback {
                finger: finger_name.to_owned(),
                correct,
                message: if correct {
                    None
                } else if !is_pressing {
                    Some(format!("{finger_name} finger is not pressing down"))
                } else {
                    Some(format!("{finger_name} finger is ~{fret_diff} fret(s) off"))
                },
            });
        }
    }

    let total = expected.len().max(1);
    let score = ((correct_count as f32 / total as f32) * 100.0).round() as i32;

    let summary = if score >= 90 {
        "Great chord shape!".into()
    } else if score >= 70 {
        "Almost there — check highlighted fingers.".into()
    } else {
        "Keep practicing — focus on finger placement.".into()
    };

    VisionScore { overall_score: score, per_finger, summary }
}

fn finger_index(name: &str) -> Option<usize> {
    match name {
        "index"  => Some(8),
        "middle" => Some(12),
        "ring"   => Some(16),
        "pinky"  => Some(20),
        _ => None,
    }
}

fn fallback_score(reason: &str) -> VisionScore {
    VisionScore {
        overall_score: 0,
        per_finger: vec![],
        summary: reason.into(),
    }
}
