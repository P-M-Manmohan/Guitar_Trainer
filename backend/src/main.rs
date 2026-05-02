use axum::Router;
use tokio::net::TcpListener;
use std::sync::{Arc, Mutex};


mod api;
mod audio;
mod engine;
mod theory;

pub struct AppState {
    pub current_note: Mutex<String>,
}

#[tokio::main]
async fn main() {

    let shared_state = Arc::new(AppState {
        current_note: Mutex::new("Silence".to_string()),
    });

    let state_for_engine = shared_state.clone();
    
    std::thread::spawn(move || {
        engine::start(state_for_engine);
    });
    
    let app = create_app();

    let listener = TcpListener::bind("127.0.0.1:8080").await.unwrap();
    println!("server is running on {:?}",listener);

    axum::serve(listener, app).await.unwrap();
}

fn create_app() -> Router {
    api::routes::create_routes()
}


