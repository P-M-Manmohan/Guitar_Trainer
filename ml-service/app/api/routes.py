import base64
from threading import Lock

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    FingerPlacement,
    FrameRequest,
    FrameResponse,
    Landmark,
    PracticeAnalysisRequest,
    PracticeAnalysisResponse,
)
from app.audio.chord_audio import AudioChordResult
from app.practice.chord_feedback import ChordPracticeEvaluator
from app.practice.session_smoothing import PracticeSessionSmoother
from app.vision.fingering_classifier import ChordClassifier
from app.vision.fretboard_detection import FretboardDetector
from app.vision.hand_tracking import HandTracker

router = APIRouter()

MAX_IMAGE_BYTES = 3_000_000
MAX_RAW_IMAGE_BYTES = 1_500_000
TIMESTAMP_TOLERANCE_MS = 350

tracker = None
live_tracker = None
classifier = ChordClassifier()
fret_detector = FretboardDetector()
practice_evaluator = ChordPracticeEvaluator()
practice_smoother = PracticeSessionSmoother(window_size=5)
frame_tracker_lock = Lock()
live_tracker_lock = Lock()


def _get_tracker(live: bool):
    global tracker, live_tracker
    current = live_tracker if live else tracker
    if current is not None:
        return current
    try:
        current = HandTracker(static_image_mode=not live, max_num_hands=1)
    except Exception as exc:
        raise HTTPException(
            503,
            f"MediaPipe hand tracking is unavailable: {exc}",
        ) from exc
    if live:
        live_tracker = current
    else:
        tracker = current
    return current


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
                raise HTTPException(422, "Raw RGB frames require width and height.")
            expected_bytes = image_width * image_height * 3
            if expected_bytes > MAX_RAW_IMAGE_BYTES:
                raise HTTPException(413, "Raw RGB frame is too large.")
            if len(image_data) != expected_bytes:
                raise HTTPException(
                    400,
                    f"Raw RGB frame has {len(image_data)} bytes; expected {expected_bytes}.",
                )
            frame_rgb = np.frombuffer(image_data, np.uint8).reshape(
                (image_height, image_width, 3)
            )
            return cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

        if len(image_data) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Encoded image is too large.")
        frame = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(400, "Invalid image encoding or format.")
        return frame
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Failed to decode image: {exc}") from exc


def _timing_warning(frame_timestamp_ms, audio_timestamp_ms):
    if frame_timestamp_ms is None or audio_timestamp_ms is None:
        return None
    difference = abs(frame_timestamp_ms - audio_timestamp_ms)
    if difference > TIMESTAMP_TOLERANCE_MS:
        return f"Camera frame and audio are {difference} ms apart."
    return None


def _neck_bbox_to_dict(neck_bbox):
    return neck_bbox.model_dump() if neck_bbox is not None else None


def _format_landmarks(landmarks):
    if not landmarks:
        return None
    return [Landmark(**landmark) for landmark in landmarks]


def _format_placement(placement):
    if not placement:
        return None
    return {
        finger: FingerPlacement(**information)
        for finger, information in placement.items()
    }


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-service"}


@router.post("/process-frame", response_model=FrameResponse)
def process_frame(payload: FrameRequest):
    frame = _decode_frame(payload.image)
    with frame_tracker_lock:
        landmarks = _get_tracker(live=False).process_frame(frame)
        if not landmarks:
            return FrameResponse(hand_detected=False)
        chord_name, confidence = classifier.predict(landmarks)
        placement = fret_detector.analyze_hand_placement(
            landmarks, _neck_bbox_to_dict(payload.neck_bbox), frame
        )
    return FrameResponse(
        hand_detected=True,
        landmarks=_format_landmarks(landmarks),
        predicted_chord=chord_name,
        chord_confidence=confidence,
        finger_placement=_format_placement(placement),
    )


@router.post("/analyze-practice", response_model=PracticeAnalysisResponse)
def analyze_practice(payload: PracticeAnalysisRequest):
    if payload.mode == "selected" and not payload.target_chord:
        raise HTTPException(422, "target_chord is required in selected mode.")

    frame = _decode_frame(
        payload.image,
        payload.image_format,
        payload.image_width,
        payload.image_height,
    )
    with live_tracker_lock:
        landmarks = _get_tracker(live=True).process_frame(frame)
        chord_name = None
        confidence = 0.0
        placement = None
        if landmarks:
            chord_name, confidence = classifier.predict(landmarks)
            placement = fret_detector.analyze_hand_placement(
                landmarks, _neck_bbox_to_dict(payload.neck_bbox), frame
            )

    timing_warning = None
    audio_result = AudioChordResult(
        audio_detected=False,
        predicted_chord=None,
        confidence=0.0,
        matches_target=False,
        message="Audio analysis is disabled; feedback uses finger placement only.",
        pitch_classes=[],
    )

    if payload.mode == "free":
        feedback = practice_evaluator.recognize(
            predicted_chord=chord_name,
            chord_confidence=confidence,
            finger_placement=placement,
            audio_result=audio_result,
            hand_detected=bool(landmarks),
            timing_warning=timing_warning,
        )
    else:
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
            target_chord=payload.target_chord or "",
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
            feedback, stable_status, stable_score, frames_considered
        )

    return PracticeAnalysisResponse(
        hand_detected=bool(landmarks),
        landmarks=_format_landmarks(landmarks),
        finger_placement=_format_placement(placement),
        **feedback.to_dict(),
    )
