pub struct OnsetDetector {
    last_energy: f32,
    threshold: f32,
}

impl OnsetDetector {
    pub fn new(threshold: f32) -> Self{
        Self { last_energy: 0.0, threshold }
    }

    pub fn is_onset(&mut self, samples: &[f32]) -> bool {
        let energy = (samples.iter().map(|x| x * x).sum::<f32>() / samples.len() as f32).sqrt();

        let is_detected = energy > self.threshold; 
        
        self.last_energy = energy;

        is_detected
    }
}
