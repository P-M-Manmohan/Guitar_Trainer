from collections import Counter, deque
from pathlib import Path
from threading import Lock
from time import monotonic
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np


DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "home_chord_model.h5"
DEFAULT_CLASSES_PATH = Path(__file__).resolve().parents[1] / "models" / "home_chord_classes.npy"


class HomeChordDetector:
    """TensorFlow landmark classifier used only by Home/free practice."""

    def __init__(
        self,
        model_path: Path = DEFAULT_MODEL_PATH,
        classes_path: Path = DEFAULT_CLASSES_PATH,
        confidence_threshold: float = 0.80,
        buffer_size: int = 10,
        minimum_samples: int = 3,
        session_ttl_seconds: int = 30 * 60,
        max_sessions: int = 1000,
    ):
        self.model_path = Path(model_path)
        self.classes_path = Path(classes_path)
        self.confidence_threshold = confidence_threshold
        self.buffer_size = buffer_size
        self.minimum_samples = minimum_samples
        self.session_ttl_seconds = session_ttl_seconds
        self.max_sessions = max_sessions
        self._model = None
        self._classes: Optional[np.ndarray] = None
        self._load_attempted = False
        self._load_lock = Lock()
        self._prediction_lock = Lock()
        self._buffers: Dict[str, Deque[Tuple[str, float]]] = {}
        self._last_seen: Dict[str, float] = {}
        self._last_cleanup = 0.0
        self.error: Optional[str] = None

    @property
    def available(self) -> bool:
        self._ensure_loaded()
        return self._model is not None and self._classes is not None

    def _ensure_loaded(self) -> None:
        if self._load_attempted:
            return
        with self._load_lock:
            if self._load_attempted:
                return
            self._load_attempted = True
            try:
                import tensorflow as tf

                if not self.model_path.exists() or not self.classes_path.exists():
                    raise FileNotFoundError("Home chord model assets are missing.")
                model = tf.keras.models.load_model(self.model_path, compile=False)
                classes = np.load(self.classes_path, allow_pickle=True)
                if model.input_shape[-1] != 63:
                    raise ValueError(f"Expected 63 model inputs, got {model.input_shape}.")
                if model.output_shape[-1] != len(classes):
                    raise ValueError("Model output count does not match classes.npy.")
                self._model = model
                self._classes = classes.astype(str)
            except Exception as exc:
                self.error = str(exc)
                self._model = None
                self._classes = None

    @staticmethod
    def extract_features(landmarks: List[Dict[str, float]]) -> np.ndarray:
        if len(landmarks) != 21:
            raise ValueError("Expected exactly 21 hand landmarks.")
        points = np.asarray(
            [[item["x"], item["y"], item["z"]] for item in landmarks],
            dtype=np.float32,
        )
        points -= points[0]
        maximum = float(np.max(np.abs(points)))
        if maximum > 0:
            points /= maximum
        return points.reshape(63)

    def predict_features(self, features: np.ndarray) -> Tuple[Optional[str], float]:
        self._ensure_loaded()
        if self._model is None or self._classes is None:
            return None, 0.0
        try:
            with self._prediction_lock:
                probabilities = self._model(
                    np.asarray(features, dtype=np.float32).reshape(1, 63),
                    training=False,
                ).numpy()[0]
            index = int(np.argmax(probabilities))
            confidence = float(probabilities[index])
            label = str(self._classes[index])
            if confidence < self.confidence_threshold:
                return None, confidence
            return label, confidence
        except Exception as exc:
            # Keep the API alive and allow the legacy classifier fallback.
            self.error = str(exc)
            self._model = None
            self._classes = None
            return None, 0.0

    def predict(
        self,
        landmarks: List[Dict[str, float]],
        session_id: str,
    ) -> Tuple[Optional[str], float]:
        label, confidence = self.predict_features(self.extract_features(landmarks))
        if not label:
            return None, confidence

        now = monotonic()
        self._cleanup_buffers(now)
        buffer = self._buffers.get(session_id)
        if buffer is None or now - self._last_seen.get(session_id, 0.0) > 3.0:
            buffer = deque(maxlen=self.buffer_size)
            self._buffers[session_id] = buffer
        self._last_seen[session_id] = now
        buffer.append((label, confidence))

        if len(buffer) < self.minimum_samples:
            return None, confidence
        winner, votes = Counter(item[0] for item in buffer).most_common(1)[0]
        if votes < max(2, int(np.ceil(len(buffer) * 0.60))):
            return None, confidence
        winner_confidences = [value for item, value in buffer if item == winner]
        return winner, float(np.mean(winner_confidences))

    def _cleanup_buffers(self, now: float) -> None:
        if now - self._last_cleanup < 60 and len(self._buffers) < self.max_sessions:
            return
        expired = [
            session_id
            for session_id, last_seen in self._last_seen.items()
            if now - last_seen > self.session_ttl_seconds
        ]
        for session_id in expired:
            self._buffers.pop(session_id, None)
            self._last_seen.pop(session_id, None)
        overflow = len(self._buffers) - self.max_sessions + 1
        if overflow > 0:
            oldest = sorted(self._last_seen, key=self._last_seen.get)[:overflow]
            for session_id in oldest:
                self._buffers.pop(session_id, None)
                self._last_seen.pop(session_id, None)
        self._last_cleanup = now
