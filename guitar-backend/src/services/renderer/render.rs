use crate::svg::{
    elements::{end_svg, start_svg},
    grid::{
        draw_frets,
        draw_nut,
        draw_start_fret_number,
        draw_strings,
    },
    marker::{
        draw_barre,
        draw_finger_circle,
        draw_muted_string,
        draw_open_string,
    },
};

const SVG_WIDTH: i32 = 180;
const SVG_HEIGHT: i32 = 230;

pub fn render_diagram(
    frets: &[Option<u8>],
    fingers: &[u8],
    barre: Option<u8>,
) -> String {
    assert_eq!(frets.len(), 6);
    assert_eq!(fingers.len(), 6);

    // Determine the first visible fret.
    let start_fret = frets
        .iter()
        .flatten()
        .copied()
        .filter(|f| *f > 0)
        .min()
        .unwrap_or(1);

    let start_fret = if start_fret <= 4 {
        1
    } else {
        start_fret
    };

    let mut svg = String::new();

    svg.push_str(&start_svg(SVG_WIDTH, SVG_HEIGHT));

    // Grid
    svg.push_str(&draw_strings());
    svg.push_str(&draw_frets());

    if start_fret == 1 {
        svg.push_str(&draw_nut());
    } else {
        svg.push_str(&draw_start_fret_number(start_fret));
    }

    // String markers
    for (string, fret) in frets.iter().enumerate() {
        match fret {
            None => {
                svg.push_str(&draw_muted_string(string));
            }
            Some(0) => {
                svg.push_str(&draw_open_string(string));
            }
            Some(f) => {
                let finger = fingers
                    .get(string)
                    .copied()
                    .filter(|n| *n > 0);

                svg.push_str(&draw_finger_circle(
                    string,
                    *f,
                    start_fret,
                    finger,
                ));
            }
        }
    }

    // Barre chord
    if let Some(barre_fret) = barre {
        let strings: Vec<usize> = frets
            .iter()
            .enumerate()
            .filter_map(|(i, f)| match f {
                Some(n) if *n == barre_fret => Some(i),
                _ => None,
            })
            .collect();

        if strings.len() >= 2 {
            svg.push_str(&draw_barre(
                *strings.first().unwrap(),
                *strings.last().unwrap(),
                barre_fret,
                start_fret,
            ));
        }
    }

    svg.push_str(&end_svg());

    svg
} -> String
