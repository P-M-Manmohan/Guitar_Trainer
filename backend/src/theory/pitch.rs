use rustfft::num_complex::Complex;

///inputs fft data and identifies the peak(main) frequency being played
pub fn detect_pitch(fft_data: &[Complex<f32>], sample_rate: f32) -> f32 {
    let half_len = fft_data.len() / 2;

    let mut max_magnitude = 0.0;
    let mut peak_bin = 0;

    for (i, c) in fft_data.iter().take(half_len).enumerate().skip(1) {
        let mag = c.norm();
        if mag > max_magnitude {
            max_magnitude = mag;
            peak_bin = i;
        }
    }

    if max_magnitude < 5.0 || peak_bin <=1 || peak_bin >= half_len -1 {
        return 0.0;
    }

    let alpha = fft_data[peak_bin - 1].norm();
    let beta = fft_data[peak_bin].norm();
    let gamma = fft_data[peak_bin + 1].norm();

    let p = 0.5 * (alpha - gamma) / (alpha - 2.0 * beta + gamma);
    let refined_bin = peak_bin as f32 + p;

    let freq = refined_bin * sample_rate / fft_data.len() as f32;

    if freq < 60.0 || freq > 1200.0 {
        return 0.0;
    }

    freq
}
