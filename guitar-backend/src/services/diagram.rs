use crate::models::{chord::{ParsedChord, Barre, ChordShape},svg::Svg};
use crate::services::draw::{
    draw_strings,
    draw_frets,
    draw_start_fret,
    draw_open_and_muted,
    draw_finger_dots,
    draw_barres,

};


impl From<&ChordShape> for ParsedChord {
    fn from(position: &ChordShape) -> Self {
        let frets = parse_frets(&position.frets);
        let fingers = parse_fingers(&position.fingers);
        let barres = parse_barres(position.barres);

        let start_fret = calculate_start_fret(&frets);

        ParsedChord {
            frets,
            fingers,
            barres,
            start_fret,
        }
    }
}


pub fn render_chord(position: &ChordShape) -> String {
    let parsed = ParsedChord::from(position);

    let mut svg = Svg::new(220, 280);

    draw_strings(&mut svg);
    draw_frets(&mut svg);

    draw_start_fret(&mut svg, parsed.start_fret);

    draw_open_and_muted(&mut svg, &parsed);

    draw_finger_dots(&mut svg, &parsed);

    draw_barres(&mut svg, &parsed);

    svg.finish()
}


fn parse_frets(s: &str) -> Vec<Option<u8>> {
    s.chars()
        .map(|c| match c {
            'x' | 'X' => None,
            '0' => Some(0),
            '1'..='9' => Some(c.to_digit(10).unwrap() as u8),
            'a'..='z' => Some(10 + (c as u8 - b'a')),
            _ => None,
        })
        .collect()
}

fn parse_fingers(s: &str) -> Vec<Option<u8>> {
    s.chars()
        .map(|c| match c {
            '0' => None,
            _ => Some(c.to_digit(10).unwrap() as u8),
        })
        .collect()
}

fn parse_barres(s: Option<i32>) -> Vec<u8> {
    match s {
        None => vec![0],
        Some(num) => vec![num as u8],
    }
}

fn calculate_start_fret(frets: &[Option<u8>]) -> u8 {
    let min = frets
        .iter()
        .flatten()
        .copied()
        .filter(|f| *f > 0)
        .min()
        .unwrap_or(1);

    if min <= 3 {
        1
    } else {
        min
    }
}

pub fn infer_barres(chord: &ParsedChord) -> Vec<Barre> {
    let mut result = Vec::new();

    for &barre_fret in &chord.barres {
        let mut strings = Vec::new();

        for (i, (fret, finger)) in chord
            .frets
            .iter()
            .zip(chord.fingers.iter())
            .enumerate()
        {
            if *fret == Some(barre_fret) && *finger == Some(1) {
                strings.push(i);
            }
        }

        if strings.len() >= 2 {
            result.push(Barre {
                fret: barre_fret,
                from_string: *strings.first().unwrap(),
                to_string: *strings.last().unwrap(),
            });
        }
    }

    result
}
