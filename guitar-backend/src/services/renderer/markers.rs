use crate::svg::geometry::{circle_center, string_x, TOP_MARGIN};

const OPEN_RADIUS: i32 = 6;
const FINGER_RADIUS: i32 = 8;

/// Draws an open-string marker (○)
pub fn draw_open_string(string: usize) -> String {
    format!(
        r#"<circle cx="{x}" cy="{y}" r="{r}"
            fill="white"
            stroke="black"
            stroke-width="2"/>"#,
        x = string_x(string),
        y = TOP_MARGIN - 18,
        r = OPEN_RADIUS,
    )
}

/// Draws a muted-string marker (X)
pub fn draw_muted_string(string: usize) -> String {
    let x = string_x(string);
    let y = TOP_MARGIN - 18;
    let size = 5;

    format!(
        r#"
<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"
      stroke="black" stroke-width="2"/>
<line x1="{x3}" y1="{y3}" x2="{x4}" y2="{y4}"
      stroke="black" stroke-width="2"/>
"#,
        x1 = x - size,
        y1 = y - size,
        x2 = x + size,
        y2 = y + size,
        x3 = x - size,
        y3 = y + size,
        x4 = x + size,
        y4 = y - size,
    )
}

/// Draws a finger position.
pub fn draw_finger_circle(
    string: usize,
    fret: u8,
    start_fret: u8,
    finger: Option<u8>,
) -> String {
    let (cx, cy) = circle_center(string, fret, start_fret);

    match finger {
        Some(n) if n > 0 => format!(
            r#"
<circle cx="{cx}" cy="{cy}" r="{r}" fill="black"/>
<text x="{cx}" y="{text_y}"
      text-anchor="middle"
      dominant-baseline="middle"
      font-size="10"
      fill="white"
      font-family="Arial">{finger}</text>
"#,
            cx = cx,
            cy = cy,
            r = FINGER_RADIUS,
            text_y = cy + 1,
            finger = n,
        ),
        _ => format!(
            r#"<circle cx="{cx}" cy="{cy}" r="{r}" fill="black"/>"#,
            cx = cx,
            cy = cy,
            r = FINGER_RADIUS,
        ),
    }
}
