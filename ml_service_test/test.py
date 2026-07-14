import cv2

from hand_tracker import HandTracker
from hand_tracker.visualization import draw_hand

import mediapipe as mp


def main():
    
    #print(mp.__file__)
    #print(mp.__version__)
    #print(hasattr(mp, "solutions"))
    #print(dir(mp))

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        raise RuntimeError("Could not open camera.")

    with HandTracker() as tracker:

        while True:

            success, frame = cap.read()

            if not success:
                break

            hand = tracker.process(frame)

            if hand is not None:
                draw_hand(frame, hand)

                cv2.putText(
                    frame,
                    f"Index: ({hand.index_tip.px}, {hand.index_tip.py})",
                    (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2,
                )

            cv2.imshow("Hand Tracker", frame)

            key = cv2.waitKey(1)

            if key == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
