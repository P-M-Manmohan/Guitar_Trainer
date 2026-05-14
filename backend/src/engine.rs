use ringbuf::HeapRb;
use ringbuf::traits::{ Split, Consumer, Observer};
use std::thread;
use std::sync::Arc;
use std::time::Duration;
use crate::{audio::{ processor::NoteProcessor, onset::OnsetDetector, stream, noise_remover::NoiseRemover}, AppState, theory::{ note, pitch } };


///Starts the Engine
///creates processor and onset detector objects
///
///starts background thread that accepts audio stream into stream_input.
///processes a chunk of 2048 length at a time
///checks if there is an onset of a note,i.e a new note is plucked/played
///if onset processes the chunk to get fft_data
///fft_data is used to get pitch/freq
///freq is then used to detect note
///
///#Example
///
///if i play the E string on a guitar it prints E
pub fn start(state: Arc<AppState>) {

    let rb = HeapRb::<f32>::new(8192);
    let (stream_input, mut stream_reader) = rb.split();

    println!("Initializing audio device...");

    let mut processor = NoteProcessor::new(2048);
    let mut onset_detector = OnsetDetector::new(100.0);
    let mut chunk = vec![0.0; 2048];
    let mut noise_remover = NoiseRemover::new(2048);

    println!("Calibrating... Please stay quiet for 2 seconds");
    std::thread::sleep(Duration::from_secs(2));


    thread::spawn(move || {
        
        let _stream = stream::start_input_stream(stream_input);

        if stream_reader.occupied_len() >= 2048{
            stream_reader.pop_slice(&mut chunk);
            let noise_fft = processor.process(&chunk);
            noise_remover.calibrate(noise_fft);
        }
        println!("Engine running. Play your guitar!");

        loop {
//            println!("length of input{}", stream_reader.occupied_len());
            if stream_reader.occupied_len() >= 2048 {
                stream_reader.pop_slice(&mut chunk);

                
                    let mut fft_data = processor.process(&chunk).to_vec();
                    noise_remover.subtract(&mut fft_data);
                    let freq = pitch::detect_pitch(&fft_data, 44100.0);

                    if onset_detector.is_onset(&fft_data, freq){
                        let note_name = note::freq_to_note(freq);
                        if note_name == "Silence" {
                            continue;
                        }

                        let mut current = state.current_note.lock().unwrap();
                        *current = note_name;
                        println!("NEW NOTE STRUCK: {}", *current);
                    }
                
            } else {
                thread::sleep(Duration::from_millis(5));
            }
        }
    });
}
