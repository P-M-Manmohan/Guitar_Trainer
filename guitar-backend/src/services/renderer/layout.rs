use crate::services::renderer::constants::{LEFT, TOP, STRING_SPACING, FRET_SPACING};

pub fn string_x(string: usize) -> i32 {
    LEFT + (string as i32 * STRING_SPACING)
}

pub fn fret_y(fret: u8, start_fret: u8) -> i32 {
    let relative = fret.saturating_sub(start_fret) as i32;
    TOP + relative * FRET_SPACING + FRET_SPACING / 2
}

pub fn circle_center(
    string: usize,
    fret: u8,
    start_fret: u8,
) -> (i32, i32) {
    (
        string_x(string),
        fret_y(fret, start_fret),
    )
}
