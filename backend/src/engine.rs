use ringbuf::HeapRb;
use ringbuf::traits::{ Split, Consumer, Observer};
use std::thread;
use std::sync::Arc;
use std::time::Duration;
use crate::{audio::{ processor::NoteProcessor, onset::OnsetDetector, stream}, AppState, theory::{ note, pitch } };


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
    let mut onset_detector = OnsetDetector::new(0.5);
    let mut chunk = vec![0.0; 2048];

    println!("Engine running. Play your guitar!");

    thread::spawn(move || {
        
        let _stream = stream::start_input_stream(stream_input);
        loop {
//            println!("length of input{}", stream_reader.occupied_len());
            if stream_reader.occupied_len() >= 2048 {
                stream_reader.pop_slice(&mut chunk);

                
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
