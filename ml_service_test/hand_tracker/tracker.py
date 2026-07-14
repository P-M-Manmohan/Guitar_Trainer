from __future__ import annotations

import cv2
import mediapipe as mp
import time

from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
        HandLandmarker,
        HandLandmarkerOptions,
        RunningMode,
    )
from pathlib import Path

from .models import HandLandmarks, Landmark, HandPoint

MODEL_PATH = (
            Path(__file__).resolve().parent.parent
            / "models"
            / "hand_landmarker.task"
        )



class HandTracker:
    """
    Wrapper around MediaPipe Hands.

    Input:
        OpenCV BGR image

    Output:
        HandLandmarks or None
    """
    def __init__(
            self,
            model_path: str = str(MODEL_PATH),
            num_hands: int = 1,
            ):

        options = HandLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=model_path),
                    running_mode=RunningMode.VIDEO,
                    num_hands=num_hands,
                )

        self._landmarker = HandLandmarker.create_from_options(options)

    def process(self, frame) -> HandLandmarks | None:
        """
            Parametes:
                frame -> OpenCV BGR image

            Returns:
                HandLandmarks | None
        """

        height, width= frame.shape[:2]

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=rgb,
                )

        timestamp_ms = int(time.time() * 1000)

        result = self._landmarker.detect_for_video(
                mp_image,
                timestamp_ms,
                )

        if len(result.hand_landmarks) == 0:
            return None

        hand = result.hand_landmarks[0]

        landmarks: list[Landmark] = []

        for lm in hand:
            landmarks.append(
                    Landmark(
                        x=lm.x,
                        y=lm.y,
                        z=lm.z,

                        px=int(lm.x * width),
                        py=int(lm.y * height),
                        )
                    )
        print(landmarks[HandPoint.INDEX])

        return HandLandmarks(
                    landmarks_tip=landmarks,
                    wrist=landmarks[0],
                    
                    thumb_tip=landmarks[HandPoint.THUMB],
                    index_tip=landmarks[HandPoint.INDEX],
                    middle_tip=landmarks[HandPoint.MIDDLE],
                    ring_tip=landmarks[HandPoint.RING],
                    pinky_tip=landmarks[HandPoint.PINKY],

                    thumb_mcp=landmarks[HandPoint.THUMB_MCP],
                    index_mcp=landmarks[HandPoint.INDEX_MCP],
                    middle_mcp=landmarks[HandPoint.MIDDLE_MCP],
                    ring_mcp=landmarks[HandPoint.RING_MCP],
                    pinky_mcp=landmarks[HandPoint.PINKY_MCP],

                )

    def close(self):
        """Release MediaPipe resources."""

        self._landmarker.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val,exc_tb):
        self.close()
