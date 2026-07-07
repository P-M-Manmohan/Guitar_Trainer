use constants::{
    LEFT,
    TOP,
    STRING_SPACING,
    FRET_SPACING,
};

const NUM_STRINGS: usize = 6;
const NUM_VISIBLE_FRETS: usize = 5;
const GRID_HEIGHT: i32 = FRET_SPACING * NUM_VISIBLE_FRETS as i32;

/// Draw the six vertical strings.
pub fn draw_strings() -> String {
    let mut svg = String::new();

    for string in 0..NUM_STRINGS {
        let x = string_x(string);

        svg.push_str(&format!(
            r#"<line
    x1="{x}"
    y1="{top}"
    x2="{x}"
    y2="{bottom}"
    stroke="black"
    stroke-width="1"/>"#,
            x = x,
            top = TOP,
            bottom = TOP + GRID_HEIGHT,
        ));
    }

    svg
}

/// Draw the horizontal fret lines.
pub fn draw_frets() -> String {
    let mut svg = String::new();

    let left = LEFT;
    let right = string_x(NUM_STRINGS - 1);

    for fret in 0..=NUM_VISIBLE_FRETS {
        let y = TOP + fret as i32 * FRET_SPACING;

        svg.push_str(&format!(
            r#"<line
    x1="{left}"
    y1="{y}"
    x2="{right}"
    y2="{y}"
    stroke="black"
    stroke-width="1"/>"#,
            left = left,
            right = right,
            y = y,
        ));
    }

    svg
}

/// Draw the thick nut.
/// Only call this when start_fret == 1.
pub fn draw_nut() -> String {
    let left = LEFT;
    let right = string_x(NUM_STRINGS - 1);

    format!(
        r#"<line
    x1="{left}"
    y1="{top}"
    x2="{right}"
    y2="{top}"
    stroke="black"
    stroke-width="6"
    stroke-linecap="round"/>"#,
        left = left,
        right = right,
        top = TOP,
    )
}

/// Draw the starting fret number (e.g. 5, 7, 10).
/// Returns an empty string when start_fret == 1.
pub fn draw_start_fret_number(start_fret: u8) -> String {
    if start_fret <= 1 {
        return String::new();
    }

    format!(
        r#"<text
    x="{x}"
    y="{y}"
    text-anchor="end"
    dominant-baseline="middle"
    font-size="14"
    font-family="Arial"
    fill="black">{}</text>"#,
        start_fret,
        x = LEFT - 10,
        y = TOP + FRET_SPACING / 2,
    )
}
