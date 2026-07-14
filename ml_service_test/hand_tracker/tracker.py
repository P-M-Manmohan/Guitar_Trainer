from ml_service_test.hand_tracker.models import HandLandmarks


class HandTracker:
        """
    Wrapper around MediaPipe Hands.

    Input:
        OpenCV BGR image

    Output:
        HandLandmarks or None
    """

    def __init___(
            self,
            max_num_hands: int = 1,
            model_complexity: int = 1,
            min_detection_confidence: float = 0.6,
            min_tracking_confidence: float = 0.6,
            ):
        self._mp_hands = mp.solutions.Hands
        self._hands = self._mp_hands.Hands(
                    static_imafe_mode=False,
                    max_num_hands=max_num_hands,
                    model_complexity=model_complexity,
                    min_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                )


    def process(self, frame) -> HandLandmarks | None:
        """
            Parametes:
                frame -> OpenCV BGR image

            Returns:
                HandLandmarks | None
        """



        return HandLandmarks()
