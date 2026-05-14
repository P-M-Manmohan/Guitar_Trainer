use core::f32;

use rustfft::num_complex::Complex;

pub struct OnsetDetector {
    last_amplitude: f32,
    threshold: f32,
    last_freq:f32,
}

impl OnsetDetector {
    pub fn new(threshold: f32) -> Self{
        Self { 
            last_amplitude: 0.0,
            threshold,
            last_freq: 0.0 
        }
    }

    pub fn is_onset(&mut self, fft_data: &Vec<Complex<f32>>, freq: f32) -> bool {
        let energy: f32 = fft_data
            .iter()
            .map(|c| c.re * c.re + c.im * c.im)
            .sum();

        let energy = energy.sqrt();
        let alpha = 0.2;
        let smoothed = alpha * energy + (1.0 - alpha) * self.last_amplitude;

        let diff = smoothed - self.last_amplitude;

        //println!("{},{},{}",diff,smoothed,self.last_amplitude);
        self.last_amplitude = smoothed;
        
        let base : f32= 2.0;
        let freq_threshold = freq * (1.0 - base.powf(1.0/12.0))/base.powf(1.0/12.0);
        let freq_diff = freq - self.last_freq;
        self.last_freq=freq;
        //println!("{},{}",freq_diff.abs(), freq_threshold.abs());
        diff > self.threshold || freq_diff.abs() > freq_threshold.abs() 
    }
}
