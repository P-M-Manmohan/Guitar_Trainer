from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


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

class HandPoint(IntEnum):
    WRIST = 0

    THUMB = 4
    INDEX = 8
    MIDDLE = 12
    RING = 16
    PINKY = 20
    
    THUMB_MCP = 4
    INDEX_MCP = 8
    MIDDLE_MCP = 12
    RING_MCP = 16
    PINKY_MCP = 20
