use serde::Serialize;


#[derive(Debug, Serialize)]
pub struct DailyProgress {
    pub date: chrono::NaiveDate,
    pub sessions: i64,
    pub avg_accuracy: Option<f64>,
    pub total_mins: i64,
}

