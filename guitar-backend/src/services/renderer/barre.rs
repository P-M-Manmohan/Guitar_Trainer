use crate::svg::geometry::{fret_y, string_x};

const BARRE_HEIGHT: i32 = 14;

pub fn draw_barre(
    from_string: usize,
    to_string: usize,
    fret: u8,
    start_fret: u8,
) -> String {
    let x1 = string_x(from_string);
    let x2 = string_x(to_string);

    let y = fret_y(fret, start_fret);

    let padding = 8;
    let rx = BARRE_HEIGHT / 2;

    format!(
        r#"<rect
    x="{x}"
    y="{y}"
    width="{width}"
    height="{height}"
    rx="{rx}"
    ry="{rx}"
    fill="black"/>"#,
        x = x1 - padding,
        y = y - BARRE_HEIGHT / 2,
        width = (x2 - x1) + padding * 2,
        height = BARRE_HEIGHT,
        rx = rx,
    )
}
