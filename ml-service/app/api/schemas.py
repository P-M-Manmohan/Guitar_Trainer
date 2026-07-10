from typing import Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field


class NeckBBox(BaseModel):
    top_left: Tuple[float, float]
    top_right: Tuple[float, float]
    bottom_left: Tuple[float, float]
    bottom_right: Tuple[float, float]


class FrameRequest(BaseModel):
    image: str = Field(..., description="Base64 JPEG or PNG camera frame")
    neck_bbox: Optional[NeckBBox] = None


class ExpectedFingerPosition(BaseModel):
    string: int = Field(..., ge=1, le=6)
    fret: int = Field(..., ge=1, le=24)


class PracticeAnalysisRequest(BaseModel):
    mode: Literal["selected", "free"] = "selected"
    target_chord: Optional[str] = None
    image: str
    image_format: Literal["encoded", "rgb"] = "encoded"
    image_width: Optional[int] = Field(None, ge=64, le=1280)
    image_height: Optional[int] = Field(None, ge=64, le=1280)
    audio: Optional[str] = None
    audio_format: Literal[
        "wav",
        "wave",
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "pcm_s16le",
        "pcm_f32le",
    ] = "wav"
    audio_sample_rate: int = Field(16000, ge=8000, le=96000)
    audio_channels: int = Field(1, ge=1, le=2)
    session_id: Optional[str] = None
    frame_timestamp_ms: Optional[int] = None
    audio_timestamp_ms: Optional[int] = None
    neck_bbox: Optional[NeckBBox] = None
    expected_fingerings: Optional[List[Dict[str, ExpectedFingerPosition]]] = None


class Landmark(BaseModel):
    x: float
    y: float
    z: float


class FingerPlacement(BaseModel):
    string: int
    fret: int
    x: float
    y: float


class FingerFeedback(BaseModel):
    finger: str
    expected_string: int
    expected_fret: int
    actual_string: int
    actual_fret: int
    correct: bool
    message: str


class FrameResponse(BaseModel):
    hand_detected: bool
    landmarks: Optional[List[Landmark]] = None
    predicted_chord: Optional[str] = None
    chord_confidence: Optional[float] = None
    finger_placement: Optional[Dict[str, FingerPlacement]] = None


class PracticeAnalysisResponse(BaseModel):
    hand_detected: bool
    target_chord: str
    status: str
    raw_status: str
    stable_status: str
    overall_score: int
    placement_correct: bool
    audio_correct: bool
    predicted_chord: Optional[str]
    chord_confidence: float
    audio_predicted_chord: Optional[str]
    audio_confidence: float
    summary: str
    instruction: str
    timing_warning: Optional[str] = None
    frames_considered: int = 1
    finger_feedback: List[FingerFeedback]
    audio_message: str
    pitch_classes: List[str]
    landmarks: Optional[List[Landmark]] = None
    finger_placement: Optional[Dict[str, FingerPlacement]] = None
