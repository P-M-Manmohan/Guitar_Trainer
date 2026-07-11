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


class ChordAudioAnalyzerTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = ChordAudioAnalyzer()

    def test_raw_pcm_matches_major_and_minor_sharp_chords(self):
        cases = [
            ("C#", [277.18, 349.23, 415.30]),
            ("F#m", [185.00, 220.00, 277.18]),
        ]

        for target, frequencies in cases:
            with self.subTest(target=target):
                result = self.analyzer.analyze_base64_audio(
                    synthesize_pcm(frequencies),
                    target,
                    "pcm_s16le",
                    SAMPLE_RATE,
                    1,
                )
                self.assertTrue(result.audio_detected)
                self.assertEqual(result.predicted_chord, target)
                self.assertTrue(result.matches_target)

    def test_all_configured_chord_templates_match_clean_triads(self):
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

    def test_enharmonic_flat_names_are_normalized(self):
        self.assertEqual(normalize_chord_name("Bb Minor"), "A#m")
        self.assertEqual(normalize_chord_name("C# Major"), "C#")
        self.assertEqual(normalize_chord_name("B diminished"), "Bdim")


class ChordPracticeEvaluatorTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = ChordAudioAnalyzer()
        self.evaluator = ChordPracticeEvaluator()
        self.expected = [
            {
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            }
        ]

    def test_classifier_cannot_override_wrong_fret_positions(self):
        audio = self.analyzer.analyze_base64_audio(
            synthesize_pcm([261.63, 329.63, 392.00]),
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
            expected_fingerings=self.expected,
        )

        self.assertEqual(feedback.status, "fix_fingering")
        self.assertFalse(feedback.placement_correct)
        self.assertIn("2 of 3 fingers are correctly placed", feedback.instruction)
        self.assertIn("index finger", feedback.instruction)
        self.assertNotIn("ring finger is correctly placed", feedback.instruction)

    def test_correct_shape_is_accepted_without_using_audio(self):
        wrong_audio = self.analyzer.analyze_base64_audio(
            synthesize_pcm([293.66, 369.99, 440.00]),
            "C",
            "pcm_s16le",
            SAMPLE_RATE,
            1,
        )
        feedback = self.evaluator.evaluate(
            target_chord="C",
            predicted_chord="C",
            chord_confidence=0.90,
            finger_placement={
                "index": {"string": 2, "fret": 1},
                "middle": {"string": 4, "fret": 2},
                "ring": {"string": 5, "fret": 3},
            },
            audio_result=wrong_audio,
            hand_detected=True,
            expected_fingerings=self.expected,
        )

        self.assertEqual(feedback.status, "correct")
        self.assertTrue(feedback.placement_correct)
        self.assertIn("Perfect!", feedback.instruction)


class PracticeSessionSmootherTests(unittest.TestCase):
    def test_majority_status_is_stable_and_sessions_are_bounded(self):
        smoother = PracticeSessionSmoother(window_size=3, max_sessions=2)

        smoother.smooth("session-a", "C", "fix_fingering", 40)
        smoother.smooth("session-a", "C", "correct", 100)
        status, score, frames = smoother.smooth(
            "session-a", "C", "fix_fingering", 60
        )

        self.assertEqual(status, "fix_fingering")
        self.assertEqual(score, 50)
        self.assertEqual(frames, 3)

        smoother.smooth("session-b", "G", "correct", 100)
        smoother.smooth("session-c", "Am", "correct", 100)
        self.assertLessEqual(len(smoother._windows), 2)


if __name__ == "__main__":
    unittest.main()
