use ringbuf::HeapRb;
use ringbuf::traits::{ Split, Consumer, Observer};
use std::thread;
use std::sync::Arc;
use std::time::Duration;
use crate::{audio::{ processor::NoteProcessor, onset::OnsetDetector, stream}, AppState, theory::{ note, pitch } };

pub fn start(state: Arc<AppState>) {
    let rb = HeapRb::<f32>::new(8192);
    let (producer, mut consumer) = rb.split();

    println!("Initializing audio device...");

    let mut processor = NoteProcessor::new(2048);
    let mut onset_detector = OnsetDetector::new(0.5);
    let mut chunk = vec![0.0; 2048];

    println!("Engine running. Play your guitar!");

    thread::spawn(move || {
        
        let _stream = stream::start_input_stream(producer);
        loop {
//            println!("length of input{}", consumer.occupied_len());
            if consumer.occupied_len() >= 2048 {
                consumer.pop_slice(&mut chunk);

                
                if onset_detector.is_onset(&chunk){
                    let fft_data = processor.process(&chunk);
                    let freq = pitch::detect_pitch(fft_data, 44100.0);
                    println!("{}", freq);

                    if freq > 0.0 {
                        let note_name = note::freq_to_note(freq);

                        let mut current = state.current_note.lock().unwrap();
                        *current = note_name;
                        println!("NEW NOTE STRUCK: {}", *current);
                    }
                }
            } else {
                thread::sleep(Duration::from_millis(5));
            }
        }
    });
}
