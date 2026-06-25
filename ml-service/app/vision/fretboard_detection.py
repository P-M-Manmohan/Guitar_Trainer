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

    def map_finger_to_string_and_fret(
        self, 
        finger_x: float, 
        finger_y: float,
        neck_bbox: Optional[Dict[str, Tuple[float, float]]] = None
    ) -> Tuple[int, int]:
        """
        Maps normalized coordinates of a fingertip (0.0 to 1.0) to a string (1-6) and fret (0-5).
        Returns a tuple (string_number, fret_number).
        Fret 0 means open/not fretted on the fretboard range.
        """
        if neck_bbox is None:
            neck_bbox = self.default_neck_bbox

        # 1. Linear interpolation to determine position inside the guitar neck bounding box
        # Assuming the guitar neck is roughly horizontal/diagonal
        tl = neck_bbox["top_left"]
        tr = neck_bbox["top_right"]
        bl = neck_bbox["bottom_left"]
        br = neck_bbox["bottom_right"]

        # Bounds of the neck
        min_x = min(tl[0], bl[0])
        max_x = max(tr[0], br[0])
        min_y = min(tl[1], tr[1])
        max_y = max(bl[1], br[1])

        # Check if fingertip is within bounds of the neck
        if not (min_x <= finger_x <= max_x and min_y <= finger_y <= max_y):
            # Outside neck bounds, assume open string / not fretting
            return 0, 0

        # 2. Map X coordinate to fret number (1 to 5)
        # Fret spacing decreases logarithmically towards the body, but for a 5-fret window,
        # we can use a slightly adjusted linear mapping or logarithmic scaling.
        relative_x = (finger_x - min_x) / (max_x - min_x)
        
        # Logarithmic scale approximation for frets (closer together on the right)
        # f(x) = log(x + 1) / log(2)
        fret = int(relative_x * self.num_frets) + 1
        fret = min(fret, self.num_frets)

        # 3. Map Y coordinate to string number (1 to 6)
        # String 1 is high E (bottom), String 6 is low E (top)
        relative_y = (finger_y - min_y) / (max_y - min_y)
        
        # String 6 is at the top (smaller y), String 1 at the bottom (larger y)
        string_idx = int(relative_y * self.num_strings)
        string_number = 6 - string_idx
        string_number = max(1, min(string_number, 6))

        return string_number, fret

    def analyze_hand_placement(
        self, 
        landmarks: List[Dict[str, float]], 
        neck_bbox: Optional[Dict[str, Tuple[float, float]]] = None
    ) -> Dict[str, Any]:
        """
        Maps all 5 fingers to their respective strings and frets.
        Returns a dictionary mapping each finger to its string/fret coordinate.
        """
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
