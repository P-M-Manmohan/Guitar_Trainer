pub struct Svg {
    width: u32,
    height: u32,
    body: String,
}

impl Svg {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            body: String::new(),
        }
    }

    pub fn line(
        &mut self,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        stroke: &str,
        width: f32,
    ) {
        self.body.push_str(&format!(
            r#"<line x1="{:.1}" y1="{:.1}" x2="{:.1}" y2="{:.1}" stroke="{}" stroke-width="{:.1}" />"#,
            x1, y1, x2, y2, stroke, width
        ));
    }

    pub fn circle(
        &mut self,
        cx: f32,
        cy: f32,
        r: f32,
        fill: &str,
    ) {
        self.body.push_str(&format!(
            r#"<circle cx="{:.1}" cy="{:.1}" r="{:.1}" fill="{}" />"#,
            cx, cy, r, fill
        ));
    }

    pub fn rect(
        &mut self,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        rx: f32,
        fill: &str,
    ) {
        self.body.push_str(&format!(
            r#"<rect x="{:.1}" y="{:.1}" width="{:.1}" height="{:.1}" rx="{:.1}" fill="{}" />"#,
            x, y, width, height, rx, fill
        ));
    }

    pub fn text(
        &mut self,
        x: f32,
        y: f32,
        text: &str,
        size: u32,
        color: &str,
    ) {
        self.body.push_str(&format!(
            r#"<text x="{:.1}" y="{:.1}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="{}" fill="{}">{}</text>"#,
            x, y, size, color, text
        ));
    }

    pub fn finish(self) -> String {
        format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="{}" height="{}" viewBox="0 0 {} {}">{}</svg>"#,
            self.width,
            self.height,
            self.width,
            self.height,
            self.body
        )
    }

    pub fn rounded_rect(
    &mut self,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    radius: f32,
    fill: &str,
) {
    self.body.push_str(&format!(
        r#"<rect x="{:.1}" y="{:.1}" width="{:.1}" height="{:.1}" rx="{:.1}" ry="{:.1}" fill="{}" />"#,
        x,
        y,
        width,
        height,
        radius,
        radius,
        fill
    ));
}

pub fn circle_outline(
    &mut self,
    cx: f32,
    cy: f32,
    r: f32,
    stroke: &str,
    stroke_width: f32,
) {
    self.body.push_str(&format!(
        r#"<circle cx="{:.1}" cy="{:.1}" r="{:.1}" fill="white" stroke="{}" stroke-width="{:.1}" />"#,
        cx,
        cy,
        r,
        stroke,
        stroke_width,
    ));
}
}

