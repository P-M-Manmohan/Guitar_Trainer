use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use ringbuf::traits::Producer;

pub fn start_input_stream(mut producer: impl Producer<Item = f32> + Send + 'static) -> cpal::Stream{

    let host = cpal::default_host();
    let device = host.default_input_device().expect("No input device");
    let config = device.default_input_config().expect("Failed to get config");
    let channels = config.channels() as usize;

    let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32], _| {
                for frame in data.chunks(channels) {
                    let _ = producer.try_push(frame[0]);
                }
            },
            |err| eprintln!("Stream error: {}", err),
            None
        ).unwrap();
    stream.play().unwrap();
    stream
}
