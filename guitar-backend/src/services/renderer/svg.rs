/// Draw an SVG line.
pub fn line(
    x1: i32,
    y1: i32,
    x2: i32,
    y2: i32,
    stroke: &str,
    stroke_width: i32,
) -> String {
    format!(
        r#"<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{stroke_width}"/>"#
    )
}

/// Draw an SVG circle.
pub fn circle(
    cx: i32,
    cy: i32,
    r: i32,
    fill: &str,
    stroke: &str,
    stroke_width: i32,
) -> String {
    format!(
        r#"<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"/>"#
    )
}

/// Draw SVG text.
pub fn text(
    x: i32,
    y: i32,
    value: impl AsRef<str>,
    font_size: i32,
    fill: &str,
) -> String {
    format!(
        r#"<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="{font_size}" fill="{fill}">{}</text>"#,
        value.as_ref()
    )
}

/// Draw an SVG rectangle.
pub fn rect(
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    rx: i32,
    fill: &str,
) -> String {
    format!(
        r#"<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{rx}" ry="{rx}" fill="{fill}"/>"#
    )
}

/// Begin an SVG document.
pub fn start_svg(width: i32, height: i32) -> String {
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg"
width="{width}"
height="{height}"
viewBox="0 0 {width} {height}">"#
    )
}

/// End an SVG document.
pub fn end_svg() -> String {
    "</svg>".to_string()
}
