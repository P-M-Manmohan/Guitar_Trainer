use rustfft::num_complex::Complex;

pub struct NoiseRemover{
    pub noise_floor: Vec<f32>,
}

impl NoiseRemover {
    pub fn new(bin_count: usize) -> Self {
        Self {
            noise_floor:vec![0.0; bin_count],
        }
    }

    pub fn calibrate(&mut self, noise_fft: &[Complex<f32>]){
        for (i, mag) in noise_fft.iter().enumerate() {
            self.noise_floor[i] = mag.norm();
        }
    }
    
    pub fn subtract(&self, live_fft:&mut [Complex<f32>]){
        for (i, bin) in live_fft.iter_mut().enumerate() {
            if i < self.noise_floor.len() {
                let live_mag = bin.norm();
                let noise_mag = self.noise_floor[i];

                let clean_mag = (live_mag - noise_mag).max(0.0);

                if live_mag > 0.0{
                    let scale = clean_mag / live_mag;
                    *bin = *bin * scale;
                } else {
                    *bin = Complex { re: 0.0, im:0.0};
                }



            }
        }
    }
}
