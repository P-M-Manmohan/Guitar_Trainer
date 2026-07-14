from dataclasses import dataclass
from __future__ import annotations


@dataclass(slots=True)
class Landmark:
    x: float
    y: float
    z: float

    px: int
    py: int


@dataclass(slots=True)
class HandLandmarks:
    """
    Container for all 21 Mediapipe landmarks.
    """

    landmarks_tip: list[Landmark]

    wrist: Landmark

    thumb_tip: Landmark
    index_tip: Landmark
    middle_tip: Landmark
    ring_tip: Landmark
    pinky_tip: Landmark


    thumb_mcp: Landmark
    index_mcp: Landmark
    middle_mcp: Landmark
    ring_mcp: Landmark
    pinky_mcp: Landmark
