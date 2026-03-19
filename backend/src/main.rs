use axum::{
    Router,
};
use tokio::net::TcpListener;

mod api;

#[tokio::main]
async fn main() {
    
    let app = create_app();
    
    let listener = TcpListener::bind("127.0.0.1:8000").await.unwrap();
    println!("server is running on {:?}",listener);

    axum::serve(listener, app).await.unwrap();
}

fn create_app() -> Router {
    api::routes::create_routes()
}


