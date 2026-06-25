import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from app.api.schemas import FrameRequest, FrameResponse, Landmark, FingerPlacement
from app.vision.hand_tracking import HandTracker
from app.vision.fingering_classifier import ChordClassifier
from app.vision.fretboard_detection import FretboardDetector

router = APIRouter()

# Initialize ML/Vision models globally
tracker = HandTracker(static_image_mode=True, max_num_hands=1)
classifier = ChordClassifier()
fret_detector = FretboardDetector()

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
    try:
        # 1. Decode base64 image to OpenCV BGR frame
        image_data = base64.b64decode(payload.image.split(",")[-1])
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding or format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")

    # 2. Extract Hand Landmarks
    landmarks = tracker.process_frame(frame)
    if not landmarks:
        return FrameResponse(hand_detected=False)

    # 3. Classify Chord Shape
    chord_name, confidence = classifier.predict(landmarks)

    # 4. Map Fingers to Strings/Frets
    bbox_dict = None
    if payload.neck_bbox is not None:
        bbox_dict = {
            "top_left": payload.neck_bbox.top_left,
            "top_right": payload.neck_bbox.top_right,
            "bottom_left": payload.neck_bbox.bottom_left,
            "bottom_right": payload.neck_bbox.bottom_right
        }
        
    placement = fret_detector.analyze_hand_placement(landmarks, bbox_dict)

    # 5. Format response structures
    response_landmarks = [
        Landmark(x=lm["x"], y=lm["y"], z=lm["z"]) for lm in landmarks
    ]
    
    response_placement = {
        finger: FingerPlacement(
            string=info["string"],
            fret=info["fret"],
            x=info["x"],
            y=info["y"]
        ) for finger, info in placement.items()
    }

    return FrameResponse(
        hand_detected=True,
        landmarks=response_landmarks,
        predicted_chord=chord_name,
        chord_confidence=confidence,
        finger_placement=response_placement
    )
