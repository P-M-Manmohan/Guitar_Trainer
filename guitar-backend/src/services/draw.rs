use crate::models::{chord::ParsedChord, svg::Svg};
use crate::services::diagram::infer_barres;

    const LEFT: f32 = 40.0;
    const TOP: f32 = 40.0;
    const WIDTH: f32 = 28.0 * 5.0;
    const FRET_SPACING: f32 = 32.0;
    const STRING_SPACING: f32 = 28.0;
    const HEIGHT: f32 = 160.0;
    const DOT_RADIUS: f32 = 10.0;

pub fn draw_strings(svg: &mut Svg) {

    for i in 0..6 {
        let x = LEFT + i as f32 * STRING_SPACING;

        svg.line(
            x,
            TOP,
            x,
            TOP + HEIGHT,
            "black",
            2.0,
        );
    }
}

pub fn draw_frets(svg: &mut Svg) {

    for i in 0..=5 {
        let y = TOP + i as f32 * FRET_SPACING;

        svg.line(
            LEFT,
            y,
            LEFT + WIDTH,
            y,
            "black",
            if i == 0 { 4.0 } else { 2.0 },
        );
    }
}

pub fn draw_start_fret(svg: &mut Svg, start_fret: u8) {
    if start_fret <= 1 {
        return;
    }

    let x = LEFT - 18.0;
    let y = TOP + FRET_SPACING / 2.0;

    svg.text(
        x,
        y,
        &format!("{start_fret}"),
        18,
        "#444",
    );
}

pub fn draw_open_and_muted(
    svg: &mut Svg,
    chord: &ParsedChord,
) {
    let y = TOP - 18.0;

    for (string, fret) in chord.frets.iter().enumerate() {
        let x = LEFT + string as f32 * STRING_SPACING;

        match fret {
            // Muted string
            None => {
                svg.text(
                    x,
                    y,
                    "X",
                    16,
                    "black",
                );
            }

            // Open string
            Some(0) => {
                svg.circle(
                    x,
                    y,
                    7.0,
                    "white",
                );

                svg.circle_outline(
                    x,
                    y,
                    7.0,
                    "black",
                    2.0,
                );
            }

            // Fretted string
            Some(_) => {}
        }
    }
}

pub fn draw_finger_dots(
    svg: &mut Svg,
    chord: &ParsedChord,
) {
    for (string, fret) in chord.frets.iter().enumerate() {
        let fret = match fret {
            Some(f) if *f > 0 => *f,
            _ => continue,
        };

        let finger = chord.fingers
            .get(string)
            .copied()
            .flatten();

        // Don't draw individual dots for barre notes.
        if finger == Some(1) && chord.barres.contains(&fret) {
            continue;
        }

        let displayed_fret = if chord.start_fret == 1 {
            fret
        } else {
            fret - chord.start_fret + 1
        };

        let x = LEFT + string as f32 * STRING_SPACING;

        let y = TOP
            + ((displayed_fret as f32 - 0.5) * FRET_SPACING);

        svg.circle(
            x,
            y,
            DOT_RADIUS,
            "black",
        );

        if let Some(finger) = finger {
            svg.text(
                x,
                y,
                &finger.to_string(),
                12,
                "white",
            );
        }
    }
}

pub fn draw_barres(
    svg: &mut Svg,
    chord: &ParsedChord,
) {
    for barre in infer_barres(chord) {

        let displayed_fret = if chord.start_fret == 1 {
            barre.fret
        } else {
            barre.fret - chord.start_fret + 1
        };

        let y = TOP
            + ((displayed_fret as f32 - 0.5) * FRET_SPACING)
            - DOT_RADIUS;

        let x1 = LEFT + barre.from_string as f32 * STRING_SPACING;
        let x2 = LEFT + barre.to_string as f32 * STRING_SPACING;

        svg.rounded_rect(
            x1 - DOT_RADIUS,
            y,
            (x2 - x1) + DOT_RADIUS * 2.0,
            DOT_RADIUS * 2.0,
            DOT_RADIUS,
            "black",
        );
    }
}
