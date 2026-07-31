use sqlx::PgPool;

use crate::{
    models::chord::ChordResponse,
    repositories::chord_repository,
};

pub async fn get_chord(
        pool: &PgPool,
        key: &str,
        suffix: &str,
    ) -> Result<Option<ChordResponse>, sqlx::Error> {
        
        chord_repository::get_chord(
            pool,
            key,
            suffix,
        )
        .await
}

pub async fn match_chord(
    pool: &PgPool,
    finger_placement: &serde_json::Value,
) -> Result<Option<String>, sqlx::Error> {
    let mut fingers_pat = vec!['_'; 6];
    let mut frets_pat = vec!['_'; 6];
    let mut has_placements = false;

    if let Some(obj) = finger_placement.as_object() {
        for (finger, info) in obj {
            let finger_num = match finger.as_str() {
                "index" => '1',
                "middle" => '2',
                "ring" => '3',
                "pinky" => '4',
                _ => continue,
            };

            if let Some(info_obj) = info.as_object() {
                let string = info_obj.get("string").and_then(|v| v.as_i64()).unwrap_or(0);
                let fret = info_obj.get("fret").and_then(|v| v.as_i64()).unwrap_or(0);

                if string >= 1 && string <= 6 && fret >= 1 {
                    let idx = (6 - string) as usize;
                    fingers_pat[idx] = finger_num;
                    if let Some(digit_char) = std::char::from_digit(fret as u32, 10) {
                        frets_pat[idx] = digit_char;
                    } else {
                        frets_pat[idx] = '_';
                    }
                    has_placements = true;
                }
            }
        }
    }

    if !has_placements {
        return Ok(None);
    }

    let fingers_pattern: String = fingers_pat.into_iter().collect();
    let frets_pattern: String = frets_pat.into_iter().collect();

    let matches = chord_repository::match_chord_shape(pool, &fingers_pattern, &frets_pattern).await?;
    if matches.is_empty() {
        return Ok(None);
    }

    let user_fretted_count = fingers_pattern.chars().filter(|&c| c >= '1' && c <= '4').count();

    let mut best_match: Option<(String, String)> = None;
    let mut best_score = i32::MAX;

    for (key, suffix, _db_frets, db_fingers) in matches {
        let db_fretted_count = db_fingers.chars().filter(|&c| c >= '1' && c <= '4').count();
        let diff = (db_fretted_count as i32 - user_fretted_count as i32).abs();

        if diff < best_score {
            best_score = diff;
            best_match = Some((key, suffix));
        }
    }

    if let Some((key, suffix)) = best_match {
        let suffix_formatted = match suffix.as_str() {
            "major" | "maj" => "Major".to_string(),
            "minor" | "min" => "Minor".to_string(),
            other => other.to_string(),
        };
        let name = if suffix_formatted.chars().next().map_or(false, |c| c.is_numeric()) {
            format!("{}{}", key, suffix_formatted)
        } else if suffix_formatted.starts_with('m') || suffix_formatted.starts_with('7') {
            format!("{}{}", key, suffix_formatted)
        } else {
            format!("{} {}", key, suffix_formatted)
        };
        Ok(Some(name))
    } else {
        Ok(None)
    }
}
