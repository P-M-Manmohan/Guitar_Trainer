
///
///takes the frequency and converts them into the respective musical notes
///
///examples
///
///if frequency is 440 it returns A4
pub fn freq_to_note(freq: f32) -> String {
    if freq <= 0.0 {
        return "Silence".to_string();
    }

    let a4 = 440.0;

    let semitone_distance = 12.0 * (freq / a4).log2();
    let note_index = semitone_distance.round() as i32;

    let notes = [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
    ];

    let offset_index = (note_index + 9).rem_euclid(12);

    let octave = 4 + (note_index + 9).div_euclid(12);

    format!("{}{}", notes[offset_index as usize], octave)
}
