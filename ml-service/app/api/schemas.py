from pydantic import BaseModel, Field
from typing import List, Dict, Tuple, Optional

class NeckBBox(BaseModel):
    top_left: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the top-left neck corner")
    top_right: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the top-right neck corner")
    bottom_left: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the bottom-left neck corner")
    bottom_right: Tuple[float, float] = Field(..., description="Normalized (x, y) coordinates of the bottom-right neck corner")

class FrameRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded string of the camera frame (JPEG or PNG)")
    neck_bbox: Optional[NeckBBox] = Field(None, description="Optional custom neck coordinates to override default values")

class Landmark(BaseModel):
    x: float
    y: float
    z: float

class FingerPlacement(BaseModel):
    string: int = Field(..., description="Guitar string number (1-6)")
    fret: int = Field(..., description="Guitar fret number (0-5, where 0 is open)")
    x: float = Field(..., description="Normalized fingertip X coordinate")
    y: float = Field(..., description="Normalized fingertip Y coordinate")

class FrameResponse(BaseModel):
    hand_detected: bool = Field(..., description="True if a hand was successfully detected in the frame")
    landmarks: Optional[List[Landmark]] = Field(None, description="List of 21 detected 3D landmarks")
    predicted_chord: Optional[str] = Field(None, description="The predicted chord name (e.g. G_Major)")
    chord_confidence: Optional[float] = Field(None, description="Prediction confidence score (0.0 to 1.0)")
    finger_placement: Optional[Dict[str, FingerPlacement]] = Field(None, description="String/fret mapping for each finger")
