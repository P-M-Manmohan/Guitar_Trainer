use sqlx::FromRow;
use serde::Serialize;
use uuid::Uuid;
use serde_json::Value as JsonValue;


#[derive(Debug, FromRow, Serialize)]
pub struct Tuning {
    pub id: Uuid,
    pub name: String,        
    pub slug: String,       
    pub open_strings: JsonValue, 
    pub string_count: i32,
}


