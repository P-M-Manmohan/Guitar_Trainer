import numpy as np
import pickle
import os
from typing import List, Dict, Tuple, Optional

# Landmark indices for fingers
WRIST = 0
THUMB_TIP = 4
INDEX_TIP = 8
MIDDLE_TIP = 12
RING_TIP = 16
PINKY_TIP = 20

class ChordClassifier:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            self.model_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "models",
                "chord_classifier.pkl"
            )
        else:
            self.model_path = model_path
        self.model = None
        self.load_model()

    def load_model(self):
        """Loads the pre-trained Random Forest model if it exists."""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                print(f"Loaded classifier model from {self.model_path}")
            except Exception as e:
                print(f"Error loading model: {e}")
                self.model = None

    def save_model(self):
        """Saves the current Random Forest model to disk."""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            with open(self.model_path, "wb") as f:
                pickle.dump(self.model, f)
            print(f"Saved classifier model to {self.model_path}")

    @staticmethod
    def extract_features(landmarks: List[Dict[str, float]]) -> List[float]:
        """
        Extracts translation- and scale-invariant features from 21 landmarks.
        Normalizes the hand relative to the wrist (landmark 0) and scales by max distance.
        """
        if len(landmarks) != 21:
            raise ValueError("Expected exactly 21 landmarks")

        # 1. Get wrist coordinates
        wrist_x = landmarks[WRIST]["x"]
        wrist_y = landmarks[WRIST]["y"]
        wrist_z = landmarks[WRIST]["z"]

        # 2. Subtract wrist from all landmarks to translate wrist to (0, 0, 0)
        translated = []
        for lm in landmarks:
            translated.append([
                lm["x"] - wrist_x,
                lm["y"] - wrist_y,
                lm["z"] - wrist_z
            ])

        # 3. Calculate the maximum distance from wrist to any landmark to determine scale
        translated_np = np.array(translated)
        distances = np.linalg.norm(translated_np, axis=1)
        max_dist = np.max(distances)

        if max_dist == 0:
            max_dist = 1.0

        # 4. Scale all coordinates by the max distance
        normalized = translated_np / max_dist

        # 5. Flatten the 21x3 matrix into a 63-element feature vector
        return normalized.flatten().tolist()

    def train_model(
        self,
        X_train: List[List[float]],
        y_train: List[str],
        n_estimators: int = 200,
        random_state: int = 42
    ):
        """
        Trains a Random Forest classifier.
        X_train: list of 63-element feature vectors.
        y_train: list of string labels (e.g. 'G_Major', 'C_Major').
        """
        from sklearn.ensemble import RandomForestClassifier
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            random_state=random_state,
            class_weight="balanced"
        )
        self.model.fit(X_train, y_train)
        self.save_model()

    def predict(self, landmarks: List[Dict[str, float]]) -> Tuple[str, float]:
        """
        Predicts the chord shape.
        Returns:
            Tuple of (predicted_chord_label, confidence_score)
        """
        features = self.extract_features(landmarks)

        # Use loaded ML model if available
        if self.model is not None:
            features_np = np.array(features).reshape(1, -1)
            prediction = self.model.predict(features_np)[0]
            probabilities = self.model.predict_proba(features_np)[0]
            class_idx = np.where(self.model.classes_ == prediction)[0][0]
            confidence = float(probabilities[class_idx])
            return prediction, confidence

        # Fallback to heuristics if no ML model has been trained yet
        return self._heuristic_predict(landmarks)

    def _heuristic_predict(self, landmarks: List[Dict[str, float]]) -> Tuple[str, float]:
        """
        A rule-based heuristic predictor to identify chords based on finger extensions.
        Provides a working baseline without requiring a pre-trained ML model.
        """
        # Calculate finger extensions (distance from wrist to finger tip)
        def get_dist(lm1_idx, lm2_idx):
            p1 = landmarks[lm1_idx]
            p2 = landmarks[lm2_idx]
            return np.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2)

        # Estimate extensions by comparing wrist-tip distance
        thumb_ext = get_dist(WRIST, THUMB_TIP)
        index_ext = get_dist(WRIST, INDEX_TIP)
        middle_ext = get_dist(WRIST, MIDDLE_TIP)
        ring_ext = get_dist(WRIST, RING_TIP)
        pinky_ext = get_dist(WRIST, PINKY_TIP)

        # Normalize relative to the average extension to make it size-invariant
        avg_ext = (thumb_ext + index_ext + middle_ext + ring_ext + pinky_ext) / 5.0
        if avg_ext == 0:
            avg_ext = 1.0

        t_norm = thumb_ext / avg_ext
        i_norm = index_ext / avg_ext
        m_norm = middle_ext / avg_ext
        r_norm = ring_ext / avg_ext
        p_norm = pinky_ext / avg_ext

        # Example rules for open chords:
        # G Major: Index (slightly bent), Middle (fully extended), Ring (extended), Pinky (extended)
        if p_norm > 1.2 and r_norm > 1.2 and m_norm > 1.1 and i_norm < 1.0:
            return "G_Major", 0.70

        # C Major: Index (extended), Middle (bent), Ring (extended)
        if i_norm > 1.1 and m_norm < 0.9 and r_norm > 1.1 and p_norm < 0.8:
            return "C_Major", 0.65

        # E Minor: Index (bent), Middle (extended), Ring (extended), Pinky (bent)
        if m_norm > 1.1 and r_norm > 1.1 and i_norm < 0.9 and p_norm < 0.9:
            return "E_Minor", 0.75

        # Default fallback
        return "Unknown_or_Open", 0.50
