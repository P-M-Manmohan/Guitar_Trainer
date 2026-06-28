import argparse
import csv
import os
import sys
import time
from typing import Dict, List

import cv2

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

from app.vision.hand_tracking import HandTracker


LANDMARK_FIELDNAMES = [
    f"{axis}{idx}"
    for idx in range(21)
    for axis in ("x", "y", "z")
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Capture MediaPipe hand landmarks for a labeled guitar chord."
    )
    parser.add_argument("--chord", required=True, help="Chord label to record, e.g. G, C, Em, F")
    parser.add_argument("--samples", type=int, default=100, help="Number of samples to capture")
    parser.add_argument("--camera", type=int, default=0, help="OpenCV camera index")
    parser.add_argument(
        "--output",
        default=os.path.join(PROJECT_DIR, "data", "chord_landmarks.csv"),
        help="CSV file to append collected landmark rows to",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Minimum seconds between automatic captures while a hand is detected",
    )
    parser.add_argument(
        "--manual",
        action="store_true",
        help="Capture only when the c key is pressed instead of capturing automatically",
    )
    return parser.parse_args()


def landmarks_to_row(chord: str, landmarks: List[Dict[str, float]]) -> Dict[str, float]:
    row = {"label": chord, "captured_at": time.time()}
    for idx, landmark in enumerate(landmarks):
        row[f"x{idx}"] = landmark["x"]
        row[f"y{idx}"] = landmark["y"]
        row[f"z{idx}"] = landmark["z"]
    return row


def append_row(output_path: str, row: Dict[str, float]) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    file_exists = os.path.exists(output_path) and os.path.getsize(output_path) > 0
    with open(output_path, "a", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["label", "captured_at", *LANDMARK_FIELDNAMES],
        )
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)


def main():
    args = parse_args()
    if args.samples <= 0:
        raise SystemExit("--samples must be greater than 0")

    tracker = HandTracker(static_image_mode=False, max_num_hands=1)
    camera = cv2.VideoCapture(args.camera)
    if not camera.isOpened():
        raise SystemExit(f"Could not open camera index {args.camera}")

    captured = 0
    last_capture_time = 0.0
    print(f"Recording {args.samples} samples for label '{args.chord}'")
    print("Press q to quit. Press c to capture when --manual is enabled.")

    try:
        while captured < args.samples:
            ok, frame = camera.read()
            if not ok:
                print("Camera frame read failed; stopping capture.")
                break

            landmarks = tracker.process_frame(frame)
            now = time.time()
            key = cv2.waitKey(1) & 0xFF

            should_capture = False
            if landmarks:
                if args.manual:
                    should_capture = key == ord("c")
                else:
                    should_capture = now - last_capture_time >= args.delay

            if should_capture and landmarks:
                append_row(args.output, landmarks_to_row(args.chord, landmarks))
                captured += 1
                last_capture_time = now

            status = "hand detected" if landmarks else "no hand"
            cv2.putText(
                frame,
                f"{args.chord}: {captured}/{args.samples} ({status})",
                (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0) if landmarks else (0, 0, 255),
                2,
            )
            cv2.imshow("Guitar Trainer landmark collection", tracker.draw_landmarks(frame, landmarks or []))

            if key == ord("q"):
                break
    finally:
        camera.release()
        cv2.destroyAllWindows()

    print(f"Saved {captured} samples to {args.output}")


if __name__ == "__main__":
    main()
