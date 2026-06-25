import numpy as np
import cv2
import sys
from app.vision.hand_tracking import HandTracker
from app.vision.fingering_classifier import ChordClassifier
from app.vision.fretboard_detection import FretboardDetector

def run_tests():
    print("Testing ML Service components initialization...")
    try:
        tracker = HandTracker(static_image_mode=True)
        classifier = ChordClassifier()
        fret_detector = FretboardDetector()
        print("Success: All components initialized successfully!")
    except Exception as e:
        print(f"Error: Component initialization failed: {e}")
        sys.exit(1)

    print("Testing frame processing with dummy image...")
    try:
        # Create a dummy black image (640x480 BGR)
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Test hand tracking (should return None since it's just black)
        landmarks = tracker.process_frame(dummy_frame)
        assert landmarks is None, "Expected no landmarks on black image"
        print("Success: Hand tracking processed empty frame correctly (None returned).")
        
        # Test heuristic predictor with mock landmark data (21 landmarks)
        dummy_landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]
        chord, confidence = classifier.predict(dummy_landmarks)
        print(f"Success: Chord classifier fallback predicted: {chord} (conf: {confidence})")
        
        # Test fretboard mapping
        placement = fret_detector.analyze_hand_placement(dummy_landmarks)
        print(f"Success: Fretboard analyzer outputted: {list(placement.keys())}")
        
    except Exception as e:
        print(f"Error: Frame processing test failed: {e}")
        sys.exit(1)
        
    print("All component tests passed successfully!")
    sys.exit(0)

if __name__ == "__main__":
    run_tests()
