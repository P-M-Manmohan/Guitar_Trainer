
pub fn parse_frets(s: &str) -> Vec<Option<u8>> {
    s.chars()
        .map(|c| match c {
            'x' | 'X' => None,
            '0'..='9' => Some(c.to_digit(10).unwrap() as u8),

            'a'..='z' => Some(10 + (c as u8 - b'a')),

            _ => panic!("Unknown fret {}", c),
        })
        .collect()
}

pub fn parse_fingers(s: &str) -> Vec<u8> {
    s.chars()
        .map(|c| c.to_digit(10).unwrap() as u8)
        .collect()
}
