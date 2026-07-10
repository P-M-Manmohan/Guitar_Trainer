from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional, Tuple

class NeckBBox(BaseModel):
    top_left: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the top-left neck corner")
    top_right: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the top-right neck corner")
    bottom_left: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the bottom-left neck corner")
    bottom_right: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the bottom-right neck corner")

class FrameRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded string of the camera frame (JPEG or PNG)")
    neck_bbox: Optional[NeckBBox] = Field(None, description="Optional custom neck coordinates to override default values")

class ExpectedFingerPosition(BaseModel):
    string: int = Field(..., ge=1, le=6, description="Guitar string number (1 is high E, 6 is low E)")
    fret: int = Field(..., ge=1, le=24, description="Fret pressed by this finger")

class PracticeAnalysisRequest(BaseModel):
    target_chord: str = Field(..., description="Chord the user selected for live practice, e.g. C, G, Am")
    image: str = Field(..., description="Base64 encoded camera frame from the mobile device")
    image_format: Literal["encoded", "rgb"] = Field(
        "encoded",
        description="encoded for JPEG/PNG, or rgb for packed RGB uint8 pixels",
    )
    image_width: Optional[int] = Field(None, ge=64, le=1280, description="Required for raw RGB frames")
    image_height: Optional[int] = Field(None, ge=64, le=1280, description="Required for raw RGB frames")
    audio: Optional[str] = Field(None, description="Optional base64 WAV or raw PCM clip from the mobile microphone")
    audio_format: Literal[
        "wav",
        "wave",
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "pcm_s16le",
        "pcm_f32le",
    ] = Field(
        "wav",
        description="Audio container/sample format",
    )
    audio_sample_rate: int = Field(16000, ge=8000, le=96000)
    audio_channels: int = Field(1, ge=1, le=2)
    session_id: Optional[str] = Field(None, description="Optional frontend practice session id used for temporal smoothing")
    frame_timestamp_ms: Optional[int] = Field(None, description="Capture timestamp for the camera frame")
    audio_timestamp_ms: Optional[int] = Field(None, description="Capture timestamp for the audio clip or strum event")
    neck_bbox: Optional[NeckBBox] = Field(None, description="Optional custom neck coordinates to override dynamic/default calibration")
    expected_fingerings: Optional[List[Dict[str, ExpectedFingerPosition]]] = Field(
        None,
        description="Backend chord-position variants keyed by finger name",
    )

class Landmark(BaseModel):
    x: float
    y: float
    z: float

class FingerPlacement(BaseModel):
    string: int = Field(..., description="Guitar string number (1-6)")
    fret: int = Field(..., description="Guitar fret number (0-5, where 0 is open)")
    x: float = Field(..., description="Normalized fingertip X coordinate")
    y: float = Field(..., description="Normalized fingertip Y coordinate")

class FingerFeedback(BaseModel):
    finger: str
    expected_string: int
    expected_fret: int
    actual_string: int
    actual_fret: int
    correct: bool
    message: str

class FrameResponse(BaseModel):
    hand_detected: bool = Field(..., description="True if a hand was successfully detected in the frame")
    landmarks: Optional[List[Landmark]] = Field(None, description="List of 21 detected 3D landmarks")
    predicted_chord: Optional[str] = Field(None, description="The predicted chord name (e.g. G_Major)")
    chord_confidence: Optional[float] = Field(None, description="Prediction confidence score (0.0 to 1.0)")
    finger_placement: Optional[Dict[str, FingerPlacement]] = Field(None, description="String/fret mapping for each finger")

class PracticeAnalysisResponse(BaseModel):
    hand_detected: bool
    target_chord: str
    status: str = Field(..., description="Machine-readable feedback status for the frontend UI")
    raw_status: str = Field(..., description="Single-request status before temporal smoothing")
    stable_status: str = Field(..., description="Session-smoothed status used for user-facing feedback")
    overall_score: int = Field(..., description="Combined placement/audio score from 0 to 100")
    placement_correct: bool
    audio_correct: bool
    predicted_chord: Optional[str]
    chord_confidence: float
    audio_predicted_chord: Optional[str]
    audio_confidence: float
    summary: str
    instruction: str
    timing_warning: Optional[str] = None
    frames_considered: int = Field(1, description="Number of recent session samples used for smoothing")
    finger_feedback: List[FingerFeedback]
    audio_message: str
    pitch_classes: List[str]
    landmarks: Optional[List[Landmark]] = None
    finger_placement: Optional[Dict[str, FingerPlacement]] = None
