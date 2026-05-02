use rustfft::{FftPlanner, num_complex::Complex};

pub struct NoteProcessor {
    planner: FftPlanner<f32>,
    fft_buffer: Vec<Complex<f32>>,
    window: Vec<f32>,
}


impl NoteProcessor {
   ///Create new processor 
   ///uses Hann window
   ///empty buffer with complex numbers
   ///New fftplanner (chooses the specific fft algorithm to use based on input)
   ///
   ///Gives me NoteProcessor instance
   pub  fn new(size: usize) -> Self {
        let mut window = vec![0.0; size];
        for i in 0..size {
            window[i] = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / size as f32).cos());
        }

        Self {
        planner: FftPlanner::new(),
        fft_buffer: vec![Complex::default(); size],
        window,
        }
   }
   ///calculates the fft of input signals
   ///
   ///uses forward fast fourier transform and returns result
   pub fn process(&mut self, samples: &[f32]) -> &[Complex<f32>] {

       for (i, &s) in samples.iter().enumerate() {
           //sets complex number with real component, re and imaginary component, im.
            self.fft_buffer[i] = Complex { re: s * self.window[i], im: 0.0 };
       }

       let fft = self.planner.plan_fft_forward(self.fft_buffer.len());
       fft.process(&mut self.fft_buffer);

       &self.fft_buffer
       
   }
}
