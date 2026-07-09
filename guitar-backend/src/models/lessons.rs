use serde:: Serialize;


#[derive(Serialize)]
pub struct LessonSummary {
    pub id: i64,
    pub title: String,
}

#[derive(Serialize)]
pub struct Lesson {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub url: String,
    pub completed: bool,
}
