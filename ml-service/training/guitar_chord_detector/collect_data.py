import cv2
import mediapipe as mp
import numpy as np
import csv
import os

# --- Configuration ---
CSV_FILE = "chord_dataset.csv"
FRAMES_TO_RECORD = 300  # 300 frames at ~30fps = ~10 seconds of recording

def process_landmarks(hand_landmarks):
    """Extracts and normalizes landmarks to match the inference script perfectly."""
    # Extract 21 points (x, y, z)
    landmarks = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark])
    
    # 1. Translation: Shift so wrist is at (0,0,0)
    landmarks -= landmarks[0]
    
    # 2. Scaling: Normalize by the maximum absolute value
    max_val = np.max(np.abs(landmarks))
    if max_val > 0:
        landmarks /= max_val
        
    return landmarks.flatten().tolist()

def main():
    # Ask the user what chord they are recording right now
    chord_name = input("Enter the chord name you want to record (e.g., 'C_Major'): ").strip()
    if not chord_name:
        print("No chord name provided. Exiting.")
        return

    # Initialize MediaPipe Hands
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False, 
        max_num_hands=1, 
        min_detection_confidence=0.7
    )
    mp_drawing = mp.solutions.drawing_utils

    # Setup the CSV file
    file_exists = os.path.isfile(CSV_FILE)
    with open(CSV_FILE, mode='a', newline='') as f:
        writer = csv.writer(f)
        
        # If the file is brand new, write the header row
        if not file_exists:
            # Header: 'label', 'v0', 'v1', ... 'v62'
            header = ['label'] + [f'v{i}' for i in range(63)]
            writer.writerow(header)

        cap = cv2.VideoCapture(0)
        print("\nCamera opened. Grab your guitar and position your hand.")
        print("Click on the video window, then press 'R' to start recording.")
        
        recording = False
        frames_recorded = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                continue

            # Flip for selfie-view
            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_frame)

            # Draw the hand skeleton and extract data
            if results.multi_hand_landmarks:
                hand_landmarks = results.multi_hand_landmarks[0]
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                # If we are in recording mode, process and save the frame
                if recording:
                    features = process_landmarks(hand_landmarks)
                    row = [chord_name] + features
                    writer.writerow(row)
                    frames_recorded += 1
                    
            # UI Text updates
            if not recording:
                cv2.putText(frame, f"Ready: {chord_name}. Press 'R' to start.", 
                            (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            else:
                cv2.putText(frame, f"Recording: {frames_recorded} / {FRAMES_TO_RECORD}", 
                            (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            cv2.imshow('Data Collection', frame)

            # Keyboard controls
            key = cv2.waitKey(1) & 0xFF
            if key == ord('r') and not recording:
                print("Recording started...")
                recording = True
            elif key == ord('q'):
                print("Recording canceled by user.")
                break
            
            # Stop automatically when target frames are reached
            if frames_recorded >= FRAMES_TO_RECORD:
                break

        cap.release()
        cv2.destroyAllWindows()
        print(f"\nSuccess! Recorded {frames_recorded} samples for {chord_name}.")
        print(f"Data appended to {CSV_FILE}.")

if __name__ == '__main__':
    main()