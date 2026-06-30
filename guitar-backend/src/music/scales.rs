use core::iter::Iterator;

use super::constants::notes::NOTES;

pub fn generate_scale(root: &str, scales: &[usize; 7]) -> Vec<String> {
    let root_index = NOTES
        .iter()
        .position(|n| *n == root)
        .unwrap();

    scales
        .iter()
        .map(|interval| {
            NOTES[(root_index + interval) % 12].to_string()
        })
        .collect()
    
}

