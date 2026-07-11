import base64
import unittest

import numpy as np

from app.audio.chord_audio import CHORD_TONES, ChordAudioAnalyzer, normalize_chord_name
from app.practice.chord_feedback import ChordPracticeEvaluator
from app.practice.session_smoothing import PracticeSessionSmoother


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
                "index": {"string": 5, "fret": 2},
                "middle": {"string": 6, "fret": 3},
                "ring": {"string": 1, "fret": 3},
            },
            audio_result=audio,
            hand_detected=True,
        )
        self.assertEqual(feedback.status, "recognized")
        self.assertEqual(feedback.target_chord, "G")
        self.assertEqual(feedback.instruction, "This is Chord G.")


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


if __name__ == "__main__":
    unittest.main()
