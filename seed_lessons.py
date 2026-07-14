import json
import psycopg

DATABASE_URL = "postgresql://guitar:guitar_secret@localhost:5433/guitar_dev"

with open("./guitar-backend/lessons.json", "r", encoding="utf-8") as f:
    data = json.load(f)

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:

        for lesson in data["curriculum"]:
            title = lesson["topic"]
            description = lesson["description"]

            # Store the first video URL
            url = lesson["videos"][0]["url"] if lesson["videos"] else ""

            cur.execute(
                """
                INSERT INTO lessons (title, description, url)
                VALUES (%s, %s, %s)
                """,
                (title, description, url),
            )

    conn.commit()

print(f"Inserted {len(data['curriculum'])} lessons.")
