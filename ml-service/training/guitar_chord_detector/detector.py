import cv2
import mediapipe as mp
import numpy as np
import tensorflow as tf
from pathlib import Path


class GuitarChordDetector:
    def __init__(self, model_path):
        # Initialize MediaPipe Hands for robust landmark detection
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )
        # Load your trained Keras/TFLite model
        model_path = Path(model_path).resolve()
        self.model = tf.keras.models.load_model(model_path)
        self.chord_classes = np.load(model_path.parent / 'classes.npy', allow_pickle=True)

    def extract_features(self, frame):
        """Extracts and normalizes hand landmarks from a raw frame."""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)

        if not results.multi_hand_landmarks:
            return None

        # Get the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # Extract 21 points (x, y, z)
        landmarks = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark])
        
        # CRITICAL STEP: Normalization
        # 1. Translation: Shift coordinates so the wrist (landmark 0) is the (0,0,0) origin.
        # This makes the prediction immune to where the hand is on the screen.
        landmarks -= landmarks[0]
        
        # 2. Scaling: Divide by the maximum absolute value.
        # This makes the prediction immune to how close the hand is to the camera.
        max_val = np.max(np.abs(landmarks))
        if max_val > 0:
            landmarks /= max_val
            
        # Return as a flat array of 63 features
        return landmarks.flatten() 

    def predict(self, frame):
        """Analyzes the frame and returns the predicted chord name."""
        features = self.extract_features(frame)
        if features is None:
            return "No hand detected"

        # Predict using the neural network
        features = np.expand_dims(features, axis=0)
        predictions = self.model.predict(features, verbose=0)
        
        confidence = np.max(predictions)
        if confidence > 0.80: # 80% confidence threshold
            predicted_index = np.argmax(predictions)
            return self.chord_classes[predicted_index]
        return "Adjusting..."
