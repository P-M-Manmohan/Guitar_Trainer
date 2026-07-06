use crate::models::chord::Chord;


pub fn build_chords(scale: &[String], qualities: &[&str; 7], roman: &[&str; 7],) -> Vec<Chord> {
    let mut chords = Vec::new();

    for i in 0..7 {
            let quality = qualities[i];


            let symbol = match quality {
                    "Major" => scale[i].clone(),
                    "Minor" => format!("{}m", scale[i]),
                    "Diminished" => format!("{}dim", scale[i]),
                    _ => scale[i].clone(),
            };

            let notes = vec![
                scale[i].clone(),
                scale[(i + 2) % 7].clone(),
                scale[(i + 4) % 7].clone(),
            ];

            chords.push(Chord{
               degree: roman[i].to_string(),
               symbol: symbol.clone(),
               name: format!("{} {}", scale[i], quality),
               quality: quality.to_string(),
               notes,
            });
}

    chords
}
