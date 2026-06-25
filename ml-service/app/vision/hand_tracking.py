import cv2
import mediapipe as mp
from typing import List, Dict, Any, Optional

class HandTracker:
    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 1,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5
    ):
        """
        Initializes the MediaPipe Hands model.
        """
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.mp_draw = mp.solutions.drawing_utils

    def process_frame(self, frame_bgr) -> Optional[List[Dict[str, float]]]:
        """
        Processes a BGR image frame and extracts 21 hand landmarks.
        Returns a list of 21 dictionaries with 'x', 'y', 'z' values if a hand is detected,
        otherwise returns None.
        """
        # Convert the BGR image to RGB before processing.
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.hands.process(frame_rgb)

        if not results.multi_hand_landmarks:
            return None

        # Focus on the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        
        landmarks_list = []
        for lm in hand_landmarks.landmark:
            landmarks_list.append({
                "x": lm.x,
                "y": lm.y,
                "z": lm.z
            })
            
        return landmarks_list

    def draw_landmarks(self, frame_bgr, landmarks_list: List[Dict[str, float]]):
        """
        Helper method to draw the detected landmarks on a frame for visualization/debugging.
        """
        if not landmarks_list:
            return frame_bgr

        # Reconstruct MediaPipe landmark format to draw
        h, w, _ = frame_bgr.shape
        for lm in landmarks_list:
            cx, cy = int(lm["x"] * w), int(lm["y"] * h)
            cv2.circle(frame_bgr, (cx, cy), 5, (0, 255, 0), cv2.FILLED)

        # Draw connections by mapping list indices back to landmark connection lists
        # We can also draw using Mediapipe's native draw utility if we had the original proto, 
        # but manual connection lines or circles are safer when we only store lists of coordinates.
        return frame_bgr
