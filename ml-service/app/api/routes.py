import base64
from threading import Lock

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from app.api.schemas import (
    FrameRequest,
    FrameResponse,
    FingerPlacement,
    Landmark,
    PracticeAnalysisRequest,
    PracticeAnalysisResponse,
)
from app.audio.chord_audio import ChordAudioAnalyzer
from app.practice.chord_feedback import ChordPracticeEvaluator
from app.practice.session_smoothing import PracticeSessionSmoother
from app.vision.hand_tracking import HandTracker
from app.vision.fingering_classifier import ChordClassifier
from app.vision.fretboard_detection import FretboardDetector

router = APIRouter()

MAX_IMAGE_BYTES = 3_000_000
MAX_RAW_IMAGE_BYTES = 1_500_000
TIMESTAMP_TOLERANCE_MS = 350

# Initialize ML/Vision models globally
tracker = HandTracker(static_image_mode=True, max_num_hands=1)
live_tracker = HandTracker(static_image_mode=False, max_num_hands=1)
classifier = ChordClassifier()
fret_detector = FretboardDetector()
audio_analyzer = ChordAudioAnalyzer()
practice_evaluator = ChordPracticeEvaluator()
practice_smoother = PracticeSessionSmoother(window_size=5)
frame_tracker_lock = Lock()
live_tracker_lock = Lock()


def _decode_frame(
    image_base64: str,
    image_format: str = "encoded",
    image_width: int | None = None,
    image_height: int | None = None,
):
    try:
        image_data = base64.b64decode(image_base64.split(",")[-1], validate=True)

        if image_format == "rgb":
            if image_width is None or image_height is None:
                raise HTTPException(
                    status_code=422,
                    detail="image_width and image_height are required for raw RGB frames.",
                )
            expected_bytes = image_width * image_height * 3
            if expected_bytes > MAX_RAW_IMAGE_BYTES:
                raise HTTPException(status_code=413, detail="Raw RGB frame is too large.")
            if len(image_data) != expected_bytes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Raw RGB frame has {len(image_data)} bytes; expected {expected_bytes}.",
                )
            frame_rgb = np.frombuffer(image_data, np.uint8).reshape(
                (image_height, image_width, 3)
            )
            return cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

        if len(image_data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image payload is too large. Send a compressed frame under 3 MB.")
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding or format")
        return frame
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")


def _timing_warning(frame_timestamp_ms, audio_timestamp_ms):
    if frame_timestamp_ms is None or audio_timestamp_ms is None:
        return None

    diff = abs(frame_timestamp_ms - audio_timestamp_ms)
    if diff > TIMESTAMP_TOLERANCE_MS:
        return (
            f"Camera frame and audio are {diff} ms apart. "
            "Send closer timestamps for reliable audio/video feedback."
        )
    return None


def _neck_bbox_to_dict(neck_bbox):
    if neck_bbox is None:
        return None

    return {
        "top_left": neck_bbox.top_left,
        "top_right": neck_bbox.top_right,
        "bottom_left": neck_bbox.bottom_left,
        "bottom_right": neck_bbox.bottom_right
    }


def _format_landmarks(landmarks):
    if not landmarks:
        return None
    return [Landmark(x=lm["x"], y=lm["y"], z=lm["z"]) for lm in landmarks]


def _format_placement(placement):
    if not placement:
        return None
    return {
        finger: FingerPlacement(
            string=info["string"],
            fret=info["fret"],
            x=info["x"],
            y=info["y"]
        ) for finger, info in placement.items()
    }

@router.get("/health")
def health_check():
    """Simple status endpoint to confirm service is alive."""
    return {"status": "ok", "service": "ml-service"}

@router.post("/process-frame", response_model=FrameResponse)
def process_frame(payload: FrameRequest):
    """
    Decodes a base64 encoded image frame, runs the MediaPipe hand tracking, 
    and predicts chord shape and finger/string/fret positions.
    """
    frame = _decode_frame(payload.image)

    # 2. Extract Hand Landmarks
    with frame_tracker_lock:
        landmarks = tracker.process_frame(frame)
        if not landmarks:
            return FrameResponse(hand_detected=False)

        # 3. Classify Chord Shape
        chord_name, confidence = classifier.predict(landmarks)

        # 4. Map Fingers to Strings/Frets
        bbox_dict = _neck_bbox_to_dict(payload.neck_bbox)
        placement = fret_detector.analyze_hand_placement(landmarks, bbox_dict, frame)

    # 5. Format response structures
    response_landmarks = _format_landmarks(landmarks)
    response_placement = _format_placement(placement)

    return FrameResponse(
        hand_detected=True,
        landmarks=response_landmarks,
        predicted_chord=chord_name,
        chord_confidence=confidence,
        finger_placement=response_placement
    )


@router.post("/analyze-practice", response_model=PracticeAnalysisResponse)
def analyze_practice(payload: PracticeAnalysisRequest):
    """
    Runs the live chord-practice loop for a selected target chord.

    The mobile app should send the current camera frame and, when available, a
    short WAV clip captured around the user's strum. The response separates
    finger-placement feedback from audio/tuning feedback for the frontend UI.
    """
    frame = _decode_frame(
        payload.image,
        payload.image_format,
        payload.image_width,
        payload.image_height,
    )
    with live_tracker_lock:
        landmarks = live_tracker.process_frame(frame)

        chord_name = None
        confidence = 0.0
        placement = None
        if landmarks:
            chord_name, confidence = classifier.predict(landmarks)
            placement = fret_detector.analyze_hand_placement(
                landmarks,
                _neck_bbox_to_dict(payload.neck_bbox),
                frame
            )

    timing_warning = _timing_warning(payload.frame_timestamp_ms, payload.audio_timestamp_ms)
    audio_result = audio_analyzer.analyze_base64_audio(
        payload.audio,
        payload.target_chord,
        payload.audio_format,
        payload.audio_sample_rate,
        payload.audio_channels,
    )
    expected_fingerings = None
    if payload.expected_fingerings:
        expected_fingerings = [
            {
                finger: position.model_dump()
                for finger, position in fingering.items()
            }
            for fingering in payload.expected_fingerings
        ]
    feedback = practice_evaluator.evaluate(
        target_chord=payload.target_chord,
        predicted_chord=chord_name,
        chord_confidence=confidence,
        finger_placement=placement,
        audio_result=audio_result,
        hand_detected=bool(landmarks),
        timing_warning=timing_warning,
        expected_fingerings=expected_fingerings,
    )

    if payload.session_id:
        stable_status, stable_score, frames_considered = practice_smoother.smooth(
            payload.session_id,
            feedback.target_chord,
            feedback.raw_status,
            feedback.overall_score,
        )
        feedback = practice_evaluator.with_status(
            feedback,
            stable_status,
            stable_score,
            frames_considered,
        )

    return PracticeAnalysisResponse(
        hand_detected=bool(landmarks),
        landmarks=_format_landmarks(landmarks),
        finger_placement=_format_placement(placement),
        **feedback.to_dict()
    )
