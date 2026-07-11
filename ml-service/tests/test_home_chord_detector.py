import csv
import unittest
from pathlib import Path

import numpy as np

from app.vision.home_chord_detector import HomeChordDetector


ROOT = Path(__file__).resolve().parents[1]
TRAINING_DIR = ROOT / "training" / "guitar_chord_detector"


class HomeChordDetectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.detector = HomeChordDetector(minimum_samples=1)
        cls.first_sample_by_label = {}
        with (TRAINING_DIR / "chord_dataset.csv").open(newline="") as dataset:
            for row in csv.DictReader(dataset):
                cls.first_sample_by_label.setdefault(
                    row["label"],
                    np.asarray([float(row[f"v{index}"]) for index in range(63)]),
                )

    def test_all_eleven_demo_chords_load_and_predict(self):
        expected = {
            "A_Major", "A_Minor", "C_7", "C_Major", "D_7", "D_Major",
            "D_Minor", "E_Major", "E_Minor", "G_7", "G_Major",
        }
        self.assertEqual(set(self.first_sample_by_label), expected)
        for label, sample in self.first_sample_by_label.items():
            with self.subTest(label=label):
                prediction, confidence = self.detector.predict_features(sample)
                self.assertEqual(prediction, label)
                self.assertGreaterEqual(confidence, 0.80)

    def test_landmark_normalization_matches_training_pipeline(self):
        landmarks = [
            {"x": 2.0 + index, "y": 4.0 + index * 2, "z": -1.0 - index}
            for index in range(21)
        ]
        features = self.detector.extract_features(landmarks)
        self.assertEqual(features.shape, (63,))
        self.assertTrue(np.allclose(features[:3], 0.0))
        self.assertAlmostEqual(float(np.max(np.abs(features))), 1.0)

    def test_live_predictions_are_smoothed_per_session(self):
        detector = HomeChordDetector(minimum_samples=3)
        sample = self.first_sample_by_label["G_Major"].reshape(21, 3)
        landmarks = [
            {"x": float(point[0]), "y": float(point[1]), "z": float(point[2])}
            for point in sample
        ]
        self.assertIsNone(detector.predict(landmarks, "session-g")[0])
        self.assertIsNone(detector.predict(landmarks, "session-g")[0])
        prediction, confidence = detector.predict(landmarks, "session-g")
        self.assertEqual(prediction, "G_Major")
        self.assertGreaterEqual(confidence, 0.80)


if __name__ == "__main__":
    unittest.main()
