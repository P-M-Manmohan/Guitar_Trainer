use sqlx::PgPool;

use crate::models::lessons::{Lesson, LessonSummary};

pub async fn get_lesson_summary(
    pool: &PgPool,
) -> Result<Vec<LessonSummary>, sqlx::Error> {

    let lesson = sqlx::query_as!(
        LessonSummary,
            r#"
            SELECT
                id,
                title
            FROM lessons
            ORDER BY id
            "#
        )
        .fetch_all(pool)
        .await?;

    Ok(lesson)

}

pub async fn get_lesson(
    pool: &PgPool,
    lesson_id: i64,
    user_id: i64,
) -> Result<Lesson, sqlx::Error> {

     let lesson = sqlx::query!(
            r#"
            SELECT
                l.id,
                l.title,
                l.description,
                l.url,

                EXISTS (
                    SELECT 1
                    FROM lessons_completed lc
                    WHERE lc.lesson_id = l.id
                    AND lc.user_id = $2
                ) AS completed

            FROM lessons l
            WHERE l.id = $1"#,
            lesson_id,
            user_id
        )
        .fetch_one(pool)
        .await?;

        let lesson_details = Lesson{

               id: lesson.id,
               title: lesson.title,
               description: lesson.description,
               url: lesson.url,
               completed: lesson.completed.unwrap_or(false),
        };


    Ok(lesson_details)
   
}
