import cv2
import numpy as np
from app.vision.hand_tracking import HandTracker
from app.vision.fingering_classifier import ChordClassifier
from app.vision.fretboard_detection import FretboardDetector

def run_webcam_demo():
    print("Initializing webcam demo components...")
    
    # 1. Initialize our ML and vision components
    # We set static_image_mode to False for video tracking optimization
    tracker = HandTracker(static_image_mode=False, max_num_hands=1)
    classifier = ChordClassifier()
    fret_detector = FretboardDetector()

    # Define hand landmark connection edges to draw the skeleton
    CONNECTIONS = [
        # Thumb
        (0, 1), (1, 2), (2, 3), (3, 4),
        # Index
        (0, 5), (5, 6), (6, 7), (7, 8),
        # Middle
        (0, 9), (9, 10), (10, 11), (11, 12),
        # Ring
        (0, 13), (13, 14), (14, 15), (15, 16),
        # Pinky
        (0, 17), (17, 18), (18, 19), (19, 20),
        # Knuckle connectors (Palm)
        (5, 9), (9, 13), (13, 17)
    ]

    # 2. Start webcam capture
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam. Make sure your camera is connected and not in use.")
        return

    print("\n--- Real-Time Chord Detection Active ---")
    print("Press 'q' in the window to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break

        # Flip horizontally for a mirror-like feedback
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape

        # 3. Process the frame
        landmarks = tracker.process_frame(frame)

        # Create a transparent HUD background overlay for reading stats (top-left)
        hud_bg = frame.copy()
        cv2.rectangle(hud_bg, (10, 10), (320, 260), (30, 30, 30), -1)
        # 40% transparency for HUD
        cv2.addWeighted(hud_bg, 0.4, frame, 0.6, 0, frame)

        # Draw HUD border and title
        cv2.rectangle(frame, (10, 10), (320, 260), (80, 80, 80), 1)
        cv2.putText(frame, "GUITAR CHORD DETECTOR", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Check if classifier model is loaded or heuristic fallback is active
        model_status = "ML Model (RandomForest)" if classifier.model is not None else "Heuristics Fallback"
        cv2.putText(frame, f"Mode: {model_status}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        if landmarks:
            # A. Draw the hand skeleton connections
            for connection in CONNECTIONS:
                p1_idx, p2_idx = connection
                lm1, lm2 = landmarks[p1_idx], landmarks[p2_idx]
                pt1 = (int(lm1["x"] * w), int(lm1["y"] * h))
                pt2 = (int(lm2["x"] * w), int(lm2["y"] * h))
                cv2.line(frame, pt1, pt2, (255, 120, 0), 2) # Neon Blue lines (BGR: 255, 120, 0)

            # B. Draw the joint landmarks
            for lm in landmarks:
                cx, cy = int(lm["x"] * w), int(lm["y"] * h)
                cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1) # Green dots

            # C. Classify chord shape
            chord_name, confidence = classifier.predict(landmarks)
            cv2.putText(frame, f"Chord: {chord_name}", (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(frame, f"Conf:  {confidence:.2f}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)

            # D. Map finger string/fret values
            placement = fret_detector.analyze_hand_placement(landmarks)
            
            y_offset = 150
            cv2.putText(frame, "Fingering Mapping:", (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
            
            for finger, info in placement.items():
                y_offset += 20
                status_text = f" - {finger.capitalize()}: Str {info['string']} Fret {info['fret']}"
                cv2.putText(frame, status_text, (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (240, 240, 240), 1)
        else:
            # Draw placeholder when no hand is detected
            cv2.putText(frame, "Hand: Not Detected", (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # Draw instructions to quit
        cv2.putText(frame, "Press 'q' to Quit", (w - 150, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Show the frame in a window
        cv2.imshow("Guitar Trainer ML Service - Camera Demo", frame)

        # Break loop on 'q' keypress
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Clean up resources
    cap.release()
    cv2.destroyAllWindows()
    print("Webcam session closed successfully.")

if __name__ == "__main__":
    run_webcam_demo()
