import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional, Any

class FretboardDetector:
    def __init__(self):
        # Default guitar neck calibration (relative coordinates)
        # In a real app, these boundaries are calibrated dynamically or set via a GUI overlay
        self.default_neck_bbox = {
            "top_left": (0.2, 0.4),
            "top_right": (0.8, 0.4),
            "bottom_left": (0.2, 0.7),
            "bottom_right": (0.8, 0.7)
        }
        
        # 6 Strings: Low E (6th) to High E (1st)
        self.num_strings = 6
        # 5 Frets tracked visually
        self.num_frets = 5

    @staticmethod
    def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
        return max(lower, min(upper, value))

    def detect_neck_lines(self, frame_bgr) -> List[Tuple[int, int, int, int]]:
        """
        Uses OpenCV Canny edge detection and Hough Lines to find lines
        representing the frets and strings of the guitar neck.
        """
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        # Canny Edge Detection
        edges = cv2.Canny(blurred, 50, 150, apertureSize=3)
        
        # Hough Line Transform
        lines = cv2.HoughLinesP(
            edges, 
            rho=1, 
            theta=np.pi/180, 
            threshold=100, 
            minLineLength=100, 
            maxLineGap=10
        )
        
        detected_lines = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                detected_lines.append((int(x1), int(y1), int(x2), int(y2)))
                
        return detected_lines

    def detect_neck_bbox(self, frame_bgr) -> Optional[Dict[str, Tuple[float, float]]]:
        """
        Estimates a normalized guitar neck quadrilateral from detected near-horizontal lines.

        The detector intentionally returns None when the image does not contain enough
        stable line evidence, allowing callers to fall back to user calibration or defaults.
        """
        if frame_bgr is None:
            return None

        height, width = frame_bgr.shape[:2]
        if height <= 0 or width <= 0:
            return None

        lines = self.detect_neck_lines(frame_bgr)
        if not lines:
            return None

        candidate_lines = []
        endpoint_xs = []
        for x1, y1, x2, y2 in lines:
            dx = x2 - x1
            dy = y2 - y1
            length = float(np.hypot(dx, dy))
            if length < width * 0.15 or abs(dx) < 1:
                continue

            angle = abs(np.degrees(np.arctan2(dy, dx)))
            angle = min(angle, 180.0 - angle)
            if angle > 35.0:
                continue

            slope = dy / dx
            intercept = y1 - slope * x1
            candidate_lines.append((slope, intercept, length, x1, x2))
            endpoint_xs.extend([x1, x2])

        if len(candidate_lines) < 2 or len(endpoint_xs) < 4:
            return None

        x_min = float(np.percentile(endpoint_xs, 10))
        x_max = float(np.percentile(endpoint_xs, 90))
        if x_max - x_min < width * 0.20:
            return None

        left_ys = []
        right_ys = []
        for slope, intercept, length, _, _ in candidate_lines:
            left_ys.append(slope * x_min + intercept)
            right_ys.append(slope * x_max + intercept)

        left_top = float(np.percentile(left_ys, 10))
        left_bottom = float(np.percentile(left_ys, 90))
        right_top = float(np.percentile(right_ys, 10))
        right_bottom = float(np.percentile(right_ys, 90))

        left_height = left_bottom - left_top
        right_height = right_bottom - right_top
        if left_height < height * 0.03 or right_height < height * 0.03:
            return None

        avg_height = (left_height + right_height) / 2.0
        y_padding = max(avg_height * 0.20, height * 0.015)
        x_padding = max((x_max - x_min) * 0.03, width * 0.01)

        x_min = self._clamp((x_min - x_padding) / width)
        x_max = self._clamp((x_max + x_padding) / width)
        left_top = self._clamp((left_top - y_padding) / height)
        left_bottom = self._clamp((left_bottom + y_padding) / height)
        right_top = self._clamp((right_top - y_padding) / height)
        right_bottom = self._clamp((right_bottom + y_padding) / height)

        if x_max <= x_min or left_bottom <= left_top or right_bottom <= right_top:
            return None

        return {
            "top_left": (x_min, left_top),
            "top_right": (x_max, right_top),
            "bottom_left": (x_min, left_bottom),
            "bottom_right": (x_max, right_bottom)
        }

    def _resolve_neck_bbox(
        self,
        neck_bbox: Optional[Dict[str, Tuple[float, float]]] = None,
        frame_bgr: Optional[np.ndarray] = None
    ) -> Dict[str, Tuple[float, float]]:
        if neck_bbox is not None:
            return neck_bbox

        detected_bbox = self.detect_neck_bbox(frame_bgr) if frame_bgr is not None else None
        return detected_bbox or self.default_neck_bbox

    def map_finger_to_string_and_fret(
        self, 
        finger_x: float, 
        finger_y: float,
        neck_bbox: Optional[Dict[str, Tuple[float, float]]] = None,
        frame_bgr: Optional[np.ndarray] = None
    ) -> Tuple[int, int]:
        """
        Maps normalized coordinates of a fingertip (0.0 to 1.0) to a string (1-6) and fret (0-5).
        Returns a tuple (string_number, fret_number).
        Fret 0 means open/not fretted on the fretboard range.
        """
        neck_bbox = self._resolve_neck_bbox(neck_bbox, frame_bgr)

        # 1. Linear interpolation to determine position inside the guitar neck bounding box
        # Assuming the guitar neck is roughly horizontal/diagonal
        tl = neck_bbox["top_left"]
        tr = neck_bbox["top_right"]
        bl = neck_bbox["bottom_left"]
        br = neck_bbox["bottom_right"]

        # Bounds of the neck
        min_x = min(tl[0], tr[0], bl[0], br[0])
        max_x = max(tl[0], tr[0], bl[0], br[0])
        min_y = min(tl[1], tr[1], bl[1], br[1])
        max_y = max(tl[1], tr[1], bl[1], br[1])

        # Check if fingertip is within bounds of the neck
        if not (min_x <= finger_x <= max_x and min_y <= finger_y <= max_y):
            # Outside neck bounds, assume open string / not fretting
            return 0, 0
        if max_x <= min_x:
            return 0, 0

        # 2. Map X coordinate to fret number (1 to 5)
        # For the first five frets, a linear approximation is stable enough for feedback.
        relative_x = (finger_x - min_x) / (max_x - min_x)

        top_y_at_x = tl[1] + relative_x * (tr[1] - tl[1])
        bottom_y_at_x = bl[1] + relative_x * (br[1] - bl[1])
        neck_height_at_x = bottom_y_at_x - top_y_at_x
        if neck_height_at_x <= 0:
            return 0, 0

        relative_y = (finger_y - top_y_at_x) / neck_height_at_x
        if not (0.0 <= relative_y <= 1.0):
            return 0, 0
        
        fret = int(relative_x * self.num_frets) + 1
        fret = min(fret, self.num_frets)

        # 3. Map Y coordinate to string number (1 to 6)
        # String 1 is high E (bottom), String 6 is low E (top)
        # String 6 is at the top (smaller y), String 1 at the bottom (larger y)
        string_idx = int(relative_y * self.num_strings)
        string_number = 6 - string_idx
        string_number = max(1, min(string_number, 6))

        return string_number, fret

    def analyze_hand_placement(
        self, 
        landmarks: List[Dict[str, float]], 
        neck_bbox: Optional[Dict[str, Tuple[float, float]]] = None,
        frame_bgr: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Maps all 5 fingers to their respective strings and frets.
        Returns a dictionary mapping each finger to its string/fret coordinate.
        """
        neck_bbox = self._resolve_neck_bbox(neck_bbox, frame_bgr)

        finger_tips = {
            "thumb": landmarks[4],
            "index": landmarks[8],
            "middle": landmarks[12],
            "ring": landmarks[16],
            "pinky": landmarks[20]
        }

        result = {}
        for finger_name, tip in finger_tips.items():
            string, fret = self.map_finger_to_string_and_fret(tip["x"], tip["y"], neck_bbox)
            result[finger_name] = {
                "string": string,
                "fret": fret,
                "x": tip["x"],
                "y": tip["y"]
            }

        return result
