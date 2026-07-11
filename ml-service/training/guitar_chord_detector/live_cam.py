import cv2
import mediapipe as mp
import collections # Import this at the top
from detector import GuitarChordDetector 

def main():
    detector = GuitarChordDetector('chord_model.h5')
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

    cap = cv2.VideoCapture(0)
    
    # NEW: Create a buffer that remembers the last 10 predictions
    prediction_buffer = collections.deque(maxlen=10)
    display_chord = "Waiting..."

    print("Press 'q' to quit.")

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = detector.hands.process(rgb_frame)
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    detector.mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())

        # Get the raw prediction for this specific frame
        raw_prediction = detector.predict(frame)

        # NEW: Smoothing Logic
        if raw_prediction != "No hand detected":
            prediction_buffer.append(raw_prediction)
            
        # Find the most frequent prediction in the last 10 frames
        if len(prediction_buffer) == 10:
            # Count occurrences of each prediction and get the highest
            display_chord = max(set(prediction_buffer), key=prediction_buffer.count)

        # Display the SMOOTHED result on the video feed
        cv2.putText(frame, f"Chord: {display_chord}", (10, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)

        cv2.imshow('Guitar Trainer - Live Inference', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()