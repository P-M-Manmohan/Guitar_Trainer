import os
import time
from typing import Any, Dict, List, Optional

import cv2
import mediapipe as mp
import numpy as np


class HandTracker:
    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 1,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_path: Optional[str] = None,
    ):
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "models",
                "hand_landmarker.task",
            )
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Hand Landmarker model not found at {model_path}."
            )

        self.static_image_mode = static_image_mode
        self._last_timestamp_ms = 0
        running_mode = (
            mp.tasks.vision.RunningMode.IMAGE
            if static_image_mode
            else mp.tasks.vision.RunningMode.VIDEO
        )
        options = mp.tasks.vision.HandLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(
                model_asset_path=model_path,
                delegate=mp.tasks.BaseOptions.Delegate.CPU,
            ),
            running_mode=running_mode,
            num_hands=max_num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_hand_presence_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.landmarker = mp.tasks.vision.HandLandmarker.create_from_options(options)

    def process_frame(self, frame_bgr) -> Optional[List[Dict[str, float]]]:
        if frame_bgr is None or frame_bgr.size == 0:
            return None
        frame_rgb = np.ascontiguousarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        if self.static_image_mode:
            result = self.landmarker.detect(image)
        else:
            timestamp_ms = max(
                self._last_timestamp_ms + 1,
                int(time.monotonic() * 1000),
            )
            self._last_timestamp_ms = timestamp_ms
            result = self.landmarker.detect_for_video(image, timestamp_ms)

        if not result.hand_landmarks:
            return None
        return [
            {"x": float(landmark.x), "y": float(landmark.y), "z": float(landmark.z)}
            for landmark in result.hand_landmarks[0]
        ]

    def draw_landmarks(
        self,
        frame_bgr,
        landmarks_list: List[Dict[str, Any]],
    ):
        if not landmarks_list:
            return frame_bgr
        height, width, _ = frame_bgr.shape
        for landmark in landmarks_list:
            center = (int(landmark["x"] * width), int(landmark["y"] * height))
            cv2.circle(frame_bgr, center, 5, (0, 255, 0), cv2.FILLED)
        return frame_bgr

    def close(self):
        self.landmarker.close()
