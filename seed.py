#!/usr/bin/env python3

import json
from pathlib import Path

import psycopg
from psycopg.rows import tuple_row

# ==========================
# CONFIG
# ==========================

DATABASE_URL = "postgresql://guitar:guitar_secret@localhost:5432/guitar_dev"
DATA_DIR = "./guitar-backend/guitar-chords-db-json"

# ==========================


def main():
    conn = psycopg.connect(DATABASE_URL, row_factory=tuple_row)
    conn.autocommit = False
    
    print("hello")
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT current_database(),
               current_user,
               inet_server_addr(),
               inet_server_port(),
               version();
            """
        )
        print("Connected to:", cur.fetchone())

    chord_count = 0
    position_count = 0
    position_buffer = []

    try:
        with conn.cursor() as cur:

            print("Clearing database...")

            cur.execute("""
                TRUNCATE TABLE chord_positions, chords
                RESTART IDENTITY CASCADE;
            """)

            json_files = sorted(Path(DATA_DIR).rglob("*.json"))

            print(f"Found {len(json_files)} json files")

            for file in json_files:
                with open(file, "r", encoding="utf-8") as f:
                    chord = json.load(f)

                slug = f"{chord['key']}_{chord['suffix']}"

                cur.execute(
                    """
                    INSERT INTO chords (key, suffix, slug)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (
                        chord["key"],
                        chord["suffix"],
                        slug,
                    ),
                )

                chord_id = cur.fetchone()[0]

                chord_count += 1

                for idx, pos in enumerate(chord["positions"]):
                    barre = pos.get("barres")
                    if barre is not None and barre != "":
                        barre = int(barre)
                    else:
                        barre = None
                    capo = str(pos.get("capo", "false")).lower() == "true"

                    frets_list = pos["frets"]
                    if isinstance(frets_list, list):
                        frets_str = "".join('x' if x == -1 or x == 'x' else str(x) for x in frets_list)
                    else:
                        frets_str = str(frets_list)

                    fingers_list = pos["fingers"]
                    if isinstance(fingers_list, list):
                        fingers_str = "".join('x' if x == -1 or x == 'x' else str(x) for x in fingers_list)
                    else:
                        fingers_str = str(fingers_list)

                    position_buffer.append(
                        (
                            chord_id,
                            idx,
                            frets_str,
                            fingers_str,
                            barre,
                            capo,
                        )
                    )

                    position_count += 1

            print(f"Inserting {len(position_buffer)} positions...")

            cur.executemany(
                """
                INSERT INTO chord_positions
                (
                    chord_id,
                    position_index,
                    frets,
                    fingers,
                    barres,
                    capo
                )
                VALUES (%s,%s,%s,%s,%s,%s)
                """,
                position_buffer,
            )

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM chords")
            print("Chords in transaction:", cur.fetchone()[0])

            cur.execute("SELECT COUNT(*) FROM chord_positions")
            print("Positions in transaction:", cur.fetchone()[0])

        conn.commit()

        print()
        print("Done!")
        print(f"Imported {chord_count} chords")
        print(f"Imported {position_count} positions")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    main()
