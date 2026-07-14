import cv2

from .models import HandLandmarks

# MediaPipe hand connections
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9,10), (10,11), (11,12),
    (9,13), (13,14), (14,15), (15,16),
    (13,17), (17,18), (18,19), (19,20),
    (0,17)
        ]

def draw_hand(frame, hand: HandLandmarks) -> None:
    """
    Draw the detected hand on an OpenCV frame.
    """

    #Draw bone
    for start, end in HAND_CONNECTIONS:
        p1 = hand.landmarks_tip[start]
        p2 = hand.landmarks_tip[end]

        cv2.line(
                frame,
                (p1.px, p1.py),
                (p2.px, p2.py),
                (0, 255, 0),
                2,
            )

    #Draw landmarks
    for point in hand.landmarks_tip:
        cv2.circle(
                frame,
                (point.px, point.py),
                4,
                (255, 0, 0),
                -1,
            )

    #Highlight fingertips
    fingertips = [
                hand.thumb_tip,
                hand.index_tip,
                hand.middle_tip,
                hand.ring_tip,
                hand.pinky_tip,
            ]

    for tip in fingertips:
        cv2.circle(
                frame,
                (tip.px, tip.py),
                8,
                (0,0,255),
                -1,
                )


