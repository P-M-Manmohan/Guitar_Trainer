use crate::{
    models::{
        response::ScaleResponse,
        scale::Scale,
    },
    music::{
        constants::{chord_quality::{MAJOR_KEY_QUALITIES, MAJOR_ROMAN, MINOR_KEY_QUALITIES, MINOR_ROMAN},
        intervals::{MAJOR_SCALE, MINOR_SCALE}},
        harmony::build_chords,
        scales::generate_scale
    },
};


pub fn get_major_scale(root: &str) -> ScaleResponse {
    let notes = generate_scale(root, &MAJOR_SCALE);

    let chords = build_chords(&notes,&MAJOR_KEY_QUALITIES, &MAJOR_ROMAN);

    ScaleResponse{

        scale: Scale {
            root: root.to_string(),
            scale_type: "Major".into(),
            notes,
        },

        chords,
    }
}


pub fn get_minor_scale(root: &str) -> ScaleResponse {
    let notes = generate_scale(root, &MINOR_SCALE);

    let chords = build_chords(&notes,&MINOR_KEY_QUALITIES, &MINOR_ROMAN);

    ScaleResponse{

        scale: Scale {
            root: root.to_string(),
            scale_type: "Minor".into(),
            notes,
        },

        chords,
    }
}

pub fn get_augmented_scale(root: &str) -> ScaleResponse {
    let notes = generate_scale(root, &AUGMENTED_SCALE);

    let chords = build_chords(&notes,&MINOR_KEY_QUALITIES, &MINOR_ROMAN);

    ScaleResponse {
        scale: Scale {
            root: root.to_string(),
            scale_type: "Augmented".into(),
            notes,
        },
        chords,
    }
}
