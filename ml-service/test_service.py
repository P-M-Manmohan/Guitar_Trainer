import numpy as np
import cv2
import sys
import base64
import io
import wave
from app.audio.chord_audio import ChordAudioAnalyzer
from app.practice.chord_feedback import ChordPracticeEvaluator
from app.practice.session_smoothing import PracticeSessionSmoother
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
        print(f"Success: Chord classifier predicted: {chord} (conf: {confidence})")
        
        # Test fretboard mapping
        placement = fret_detector.analyze_hand_placement(dummy_landmarks)
        print(f"Success: Fretboard analyzer outputted: {list(placement.keys())}")

        # Test dynamic fretboard calibration on synthetic near-horizontal neck lines
        synthetic_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        for y in [190, 210, 230, 250, 270, 290]:
            cv2.line(synthetic_frame, (120, y), (540, y + 25), (255, 255, 255), 3)
        detected_bbox = fret_detector.detect_neck_bbox(synthetic_frame)
        assert detected_bbox is not None, "Expected synthetic neck lines to produce a bbox"
        dynamic_placement = fret_detector.analyze_hand_placement(dummy_landmarks, frame_bgr=synthetic_frame)
        assert set(dynamic_placement.keys()) == {"thumb", "index", "middle", "ring", "pinky"}
        print(f"Success: Dynamic fretboard calibration detected bbox: {detected_bbox}")

        # Test audio chord matching and combined practice feedback with synthetic C major tones
        sample_rate = 16000
        t = np.linspace(0, 1.2, int(sample_rate * 1.2), endpoint=False)
        signal = 0.25 * (
            np.sin(2 * np.pi * 261.63 * t) +
            np.sin(2 * np.pi * 329.63 * t) +
            np.sin(2 * np.pi * 392.00 * t)
        )
        pcm = np.clip(signal * 32767, -32768, 32767).astype(np.int16)
        audio_buffer = io.BytesIO()
        with wave.open(audio_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm.tobytes())
        audio_base64 = "data:audio/wav;base64," + base64.b64encode(audio_buffer.getvalue()).decode("ascii")

        audio_result = ChordAudioAnalyzer().analyze_base64_audio(audio_base64, "C")
        assert audio_result.predicted_chord == "C", "Expected synthetic C major audio to be detected as C"
        feedback = ChordPracticeEvaluator().evaluate(
            "C",
            "C",
            0.85,
            {
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            },
            audio_result,
            True,
        )
        assert feedback.status == "correct", "Expected matching C placement/audio to pass"
        print("Success: Audio analyzer and practice feedback evaluated a synthetic C chord.")

        unsupported_audio = ChordAudioAnalyzer().analyze_base64_audio(audio_base64, "C", "m4a")
        assert not unsupported_audio.audio_detected
        assert "Unsupported audio format" in unsupported_audio.message
        print("Success: Unsupported mobile audio formats return a clear conversion message.")

        alternate_g_feedback = ChordPracticeEvaluator().evaluate(
            "G Major",
            "G",
            0.80,
            {
                "index": {"string": 5, "fret": 2},
                "middle": {"string": 6, "fret": 3},
                "pinky": {"string": 1, "fret": 3},
            },
            audio_result,
            True,
        )
        assert alternate_g_feedback.placement_correct, "Expected alternate G fingering to be accepted"
        print("Success: Alternate chord fingerings are accepted.")

        timing_feedback = ChordPracticeEvaluator().evaluate(
            "C",
            "C",
            0.85,
            {
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            },
            audio_result,
            True,
            timing_warning="Camera frame and audio are 900 ms apart.",
        )
        assert timing_feedback.status == "resync_audio_video"
        print("Success: Audio/video timestamp mismatch prevents false tuning feedback.")

        smoother = PracticeSessionSmoother(window_size=3)
        smoother.smooth("session-1", "C", "fix_fingering", 40)
        stable_status, stable_score, frames = smoother.smooth("session-1", "C", "correct", 95)
        assert stable_status in {"fix_fingering", "correct"}
        assert frames == 2
        stable_status, stable_score, frames = smoother.smooth("session-1", "C", "correct", 100)
        assert stable_status == "correct"
        assert stable_score >= 95
        assert frames == 3
        print("Success: Practice session smoothing stabilizes repeated feedback.")
        
    except Exception as e:
        print(f"Error: Frame processing test failed: {e}")
        sys.exit(1)
        
    print("All component tests passed successfully!")
    sys.exit(0)

if __name__ == "__main__":
    run_tests()
