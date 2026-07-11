import base64
import unittest

import numpy as np
import cv2

from app.audio.chord_audio import CHORD_TONES, ChordAudioAnalyzer, normalize_chord_name
from app.practice.chord_feedback import ChordPracticeEvaluator
from app.practice.session_smoothing import PracticeSessionSmoother
from app.vision.fretboard_detection import FretboardDetector


SAMPLE_RATE = 16000


def synthesize_pcm(frequencies):
    time = np.linspace(0, 1.5, int(SAMPLE_RATE * 1.5), endpoint=False)
    signal = sum(np.sin(2 * np.pi * frequency * time) for frequency in frequencies)
    signal *= 0.18
    pcm = np.clip(signal * 32767, -32768, 32767).astype("<i2")
    return base64.b64encode(pcm.tobytes()).decode("ascii")


class AudioAnalyzerTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = ChordAudioAnalyzer()

    def test_all_major_minor_and_diminished_templates(self):
        for target, pitch_classes in CHORD_TONES.items():
            frequencies = [
                440.0 * (2.0 ** (((60 + pitch_class) - 69) / 12.0))
                for pitch_class in pitch_classes
            ]
            with self.subTest(target=target):
                result = self.analyzer.analyze_base64_audio(
                    synthesize_pcm(frequencies),
                    target,
                    "pcm_s16le",
                    SAMPLE_RATE,
                    1,
                )
                self.assertTrue(result.audio_detected)
                self.assertTrue(result.matches_target)

    def test_enharmonic_names(self):
        self.assertEqual(normalize_chord_name("Bb Minor"), "A#m")
        self.assertEqual(normalize_chord_name("B diminished"), "Bdim")


class PracticeEvaluatorTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = ChordAudioAnalyzer()
        self.evaluator = ChordPracticeEvaluator()
        self.c_fingering = [
            {
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            }
        ]

    def test_classifier_does_not_override_wrong_selected_fingering(self):
        audio = self.analyzer.analyze_base64_audio(
            synthesize_pcm([261.63, 329.63, 392.0]),
            "C",
            "pcm_s16le",
            SAMPLE_RATE,
            1,
        )
        feedback = self.evaluator.evaluate(
            target_chord="C",
            predicted_chord="C",
            chord_confidence=0.99,
            finger_placement={
                "index": {"string": 3, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            },
            audio_result=audio,
            hand_detected=True,
            expected_fingerings=self.c_fingering,
        )
        self.assertEqual(feedback.status, "fix_fingering")
        self.assertIn("2 of 3 fingers are correctly placed", feedback.instruction)
        self.assertIn("index finger", feedback.instruction)

    def test_selected_shape_ignores_audio_and_uses_visual_placement(self):
        wrong_audio = self.analyzer.analyze_base64_audio(
            synthesize_pcm([293.66, 369.99, 440.0]),
            "C",
            "pcm_s16le",
            SAMPLE_RATE,
            1,
        )
        feedback = self.evaluator.evaluate(
            target_chord="C",
            predicted_chord="C",
            chord_confidence=0.9,
            finger_placement={
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            },
            audio_result=wrong_audio,
            hand_detected=True,
            expected_fingerings=self.c_fingering,
        )
        self.assertEqual(feedback.status, "correct")
        self.assertIn("Perfect!", feedback.instruction)

    def test_free_mode_recognizes_visual_chord_without_audio(self):
        audio = self.analyzer.analyze_base64_audio(
            synthesize_pcm([196.0, 246.94, 293.66]),
            None,
            "pcm_s16le",
            SAMPLE_RATE,
            1,
        )
        feedback = self.evaluator.recognize(
            predicted_chord="G",
            chord_confidence=0.9,
            finger_placement={
                # Coordinate mapping can be imperfect in a live camera frame;
                # the trained landmark classifier remains the visual signal.
                "index": {"string": 4, "fret": 2},
                "middle": {"string": 5, "fret": 3},
                "ring": {"string": 2, "fret": 4},
            },
            audio_result=audio,
            hand_detected=True,
        )
        self.assertEqual(feedback.status, "recognized")
        self.assertEqual(feedback.target_chord, "G")
        self.assertEqual(feedback.instruction, "This is Chord G Major.")

    def test_free_mode_supports_trained_seventh_chords(self):
        audio = self.analyzer.analyze_base64_audio(None)
        feedback = self.evaluator.recognize(
            predicted_chord="C_7",
            chord_confidence=0.95,
            finger_placement={"index": {"string": 2, "fret": 1}},
            audio_result=audio,
            hand_detected=True,
        )
        self.assertEqual(feedback.status, "recognized")
        self.assertEqual(feedback.target_chord, "C7")
        self.assertEqual(feedback.instruction, "This is Chord C7.")

    def test_free_mode_hides_warmup_as_analyzing(self):
        audio = self.analyzer.analyze_base64_audio(None)
        feedback = self.evaluator.recognize(
            predicted_chord="Adjusting",
            chord_confidence=0.99,
            finger_placement={"index": {"string": 2, "fret": 1}},
            audio_result=audio,
            hand_detected=True,
        )
        self.assertEqual(feedback.status, "analyzing")

    def test_selected_mode_accepts_any_database_variant(self):
        audio = self.analyzer.analyze_base64_audio(None)
        variants = [
            {
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            },
            {
                "index": {"string": 5, "fret": 5},
                "middle": {"string": 4, "fret": 5},
                "ring": {"string": 3, "fret": 5},
            },
        ]
        feedback = self.evaluator.evaluate(
            target_chord="C",
            predicted_chord=None,
            chord_confidence=0.0,
            finger_placement={
                "index": {"string": 5, "fret": 5},
                "middle": {"string": 4, "fret": 5},
                "ring": {"string": 3, "fret": 5},
            },
            audio_result=audio,
            hand_detected=True,
            expected_fingerings=variants,
        )
        self.assertEqual(feedback.status, "correct")

    def test_selected_mode_uses_first_variant_for_correction(self):
        audio = self.analyzer.analyze_base64_audio(None)
        variants = [
            {"index": {"string": 2, "fret": 1}},
            {"index": {"string": 5, "fret": 5}},
        ]
        feedback = self.evaluator.evaluate(
            target_chord="C",
            predicted_chord=None,
            chord_confidence=0.0,
            finger_placement={"index": {"string": 5, "fret": 4}},
            audio_result=audio,
            hand_detected=True,
            expected_fingerings=variants,
        )
        self.assertEqual(feedback.status, "fix_fingering")
        self.assertIn("string 2, fret 1", feedback.instruction)


class SessionSmootherTests(unittest.TestCase):
    def test_majority_and_session_limit(self):
        smoother = PracticeSessionSmoother(window_size=3, max_sessions=2)
        smoother.smooth("a", "C", "fix_fingering", 40)
        smoother.smooth("a", "C", "correct", 100)
        status, score, frames = smoother.smooth("a", "C", "fix_fingering", 60)
        self.assertEqual((status, score, frames), ("fix_fingering", 50, 3))
        smoother.smooth("b", "G", "recognized", 100)
        smoother.smooth("c", "Am", "recognized", 100)
        self.assertLessEqual(len(smoother._windows), 2)


class FretboardCalibrationTests(unittest.TestCase):
    def test_visible_fret_wires_calibrate_fret_number(self):
        frame = np.zeros((200, 400, 3), dtype=np.uint8)
        for y in [70, 80, 90, 100, 110, 120]:
            cv2.line(frame, (40, y), (350, y), (255, 255, 255), 2)
        for x in [50, 110, 167, 221, 272, 320]:
            cv2.line(frame, (x, 65), (x, 125), (255, 255, 255), 2)

        detector = FretboardDetector()
        bbox = {
            "top_left": (0.10, 0.30),
            "top_right": (0.90, 0.30),
            "bottom_left": (0.10, 0.65),
            "bottom_right": (0.90, 0.65),
        }
        boundaries = detector.detect_fret_boundaries(frame, bbox)
        self.assertGreaterEqual(len(boundaries), 5)
        _, fret = detector.map_finger_to_string_and_fret(
            0.20,
            0.45,
            bbox,
            fret_boundaries=boundaries,
        )
        self.assertEqual(fret, 1)


if __name__ == "__main__":
    unittest.main()
