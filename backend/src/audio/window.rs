pub fn hann_window(samples: &[f32]) -> Vec<f32> {
    let n = samples.len();

    samples
        .iter()
        .enumerate()
        .map(|(i, &x)| {
            let w = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / n as f32).cos());
            x * w
        })
        .collect()
}
