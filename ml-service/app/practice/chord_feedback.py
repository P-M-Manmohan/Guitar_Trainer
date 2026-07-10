from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Tuple

from app.audio.chord_audio import AudioChordResult, normalize_chord_name


Fingering = Dict[str, Dict[str, int]]

EXPECTED_FINGERINGS: Dict[str, List[Fingering]] = {
    "C": [
        {
            "index": {"string": 2, "fret": 1},
            "middle": {"string": 4, "fret": 2},
            "ring": {"string": 5, "fret": 3},
        }
    ],
    "G": [
        {
            "index": {"string": 5, "fret": 2},
            "middle": {"string": 6, "fret": 3},
            "ring": {"string": 1, "fret": 3},
        },
        {
            "index": {"string": 5, "fret": 2},
            "middle": {"string": 6, "fret": 3},
            "pinky": {"string": 1, "fret": 3},
        },
        {
            "middle": {"string": 5, "fret": 2},
            "ring": {"string": 6, "fret": 3},
            "pinky": {"string": 1, "fret": 3},
        },
    ],
    "D": [
        {
            "index": {"string": 3, "fret": 2},
            "middle": {"string": 1, "fret": 2},
            "ring": {"string": 2, "fret": 3},
        }
    ],
    "E": [
        {
            "index": {"string": 3, "fret": 1},
            "middle": {"string": 5, "fret": 2},
            "ring": {"string": 4, "fret": 2},
        }
    ],
    "A": [
        {
            "index": {"string": 4, "fret": 2},
            "middle": {"string": 3, "fret": 2},
            "ring": {"string": 2, "fret": 2},
        },
        {
            "index": {"string": 4, "fret": 2},
            "middle": {"string": 3, "fret": 2},
            "pinky": {"string": 2, "fret": 2},
        },
    ],
    "Am": [
        {
            "index": {"string": 2, "fret": 1},
            "middle": {"string": 4, "fret": 2},
            "ring": {"string": 3, "fret": 2},
        }
    ],
    "Dm": [
        {
            "index": {"string": 1, "fret": 1},
            "middle": {"string": 3, "fret": 2},
            "ring": {"string": 2, "fret": 3},
        }
    ],
    "Em": [
        {
            "middle": {"string": 5, "fret": 2},
            "ring": {"string": 4, "fret": 2},
        },
        {
            "index": {"string": 5, "fret": 2},
            "middle": {"string": 4, "fret": 2},
        },
    ],
    "F": [
        {
            "index": {"string": 1, "fret": 1},
            "middle": {"string": 3, "fret": 2},
            "ring": {"string": 5, "fret": 3},
            "pinky": {"string": 4, "fret": 3},
        }
    ],
}


@dataclass
class FingerFeedback:
    finger: str
    expected_string: int
    expected_fret: int
    actual_string: int
    actual_fret: int
    correct: bool
    message: str


@dataclass
class PracticeFeedback:
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
    timing_warning: Optional[str]
    frames_considered: int
    finger_feedback: List[FingerFeedback]
    audio_message: str
    pitch_classes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["finger_feedback"] = [asdict(item) for item in self.finger_feedback]
        return data


class ChordPracticeEvaluator:
    def evaluate(
        self,
        target_chord: str,
        predicted_chord: Optional[str],
        chord_confidence: float,
        finger_placement: Optional[Dict[str, Dict[str, Any]]],
        audio_result: AudioChordResult,
        hand_detected: bool,
        timing_warning: Optional[str] = None,
        expected_fingerings: Optional[List[Fingering]] = None,
    ) -> PracticeFeedback:
        normalized_target = normalize_chord_name(target_chord)
        variants = expected_fingerings or EXPECTED_FINGERINGS.get(normalized_target)
        if variants is None:
            supported = ", ".join(sorted(EXPECTED_FINGERINGS.keys()))
            return self._build_feedback(
                target_chord=normalized_target,
                status="unsupported_chord",
                overall_score=0,
                placement_correct=False,
                audio_correct=False,
                predicted_chord=predicted_chord,
                chord_confidence=chord_confidence,
                audio_result=audio_result,
                summary=f"{normalized_target} is not configured for live practice yet.",
                instruction=f"Supported practice chords are: {supported}.",
                finger_feedback=[],
                timing_warning=timing_warning,
            )

        if not hand_detected or not finger_placement:
            return self._build_feedback(
                target_chord=normalized_target,
                status="no_hand_detected",
                overall_score=0,
                placement_correct=False,
                audio_correct=audio_result.matches_target,
                predicted_chord=predicted_chord,
                chord_confidence=chord_confidence,
                audio_result=audio_result,
                summary="I cannot see your fretting hand clearly.",
                instruction="Move your fretting hand and the first few frets into the camera view.",
                finger_feedback=[],
                timing_warning=timing_warning,
            )

        finger_feedback, placement_score = self._best_variant_feedback(variants, finger_placement)
        placement_correct = bool(finger_feedback) and all(
            item.correct for item in finger_feedback
        )
        audio_correct = audio_result.matches_target

        if timing_warning and audio_result.audio_detected:
            audio_correct = False
            status = "resync_audio_video"
            summary = "The camera frame and audio clip do not look synchronized."
            instruction = "Capture the frame at the strum moment or send closer timestamps with the audio clip."
        elif placement_correct and audio_correct:
            status = "correct"
            summary = f"Nice, that looks and sounds like {normalized_target}."
            instruction = "Keep the same shape and strum cleanly."
        elif not placement_correct:
            status = "fix_fingering"
            summary = f"Your {normalized_target} shape needs adjustment."
            instruction = self._finger_placement_instruction(finger_feedback)
        elif audio_result.audio_detected:
            status = "check_tuning_or_strum"
            summary = "Your finger placement looks close, but the sound does not match."
            instruction = (
                "Your finger placements are correct, but the sound it produces seems off. "
                "Make sure not to mute any other strings accidentally, or it seems your guitar "
                "is not properly tuned."
            )
        else:
            status = "need_audio"
            summary = "Your finger placement looks close, but I need a clear strum to confirm the chord."
            instruction = "Strum once near the microphone after placing your fingers."

        audio_score = 1.0 if audio_correct else 0.0
        if not audio_result.audio_detected:
            audio_score = 0.25 if placement_correct else 0.0
        overall_score = int(round((placement_score * 0.65 + audio_score * 0.35) * 100))

        return self._build_feedback(
            target_chord=normalized_target,
            status=status,
            overall_score=overall_score,
            placement_correct=placement_correct,
            audio_correct=audio_correct,
            predicted_chord=predicted_chord,
            chord_confidence=chord_confidence,
            audio_result=audio_result,
            summary=summary,
            instruction=instruction,
            finger_feedback=finger_feedback,
            timing_warning=timing_warning,
        )

    def recognize(
        self,
        predicted_chord: Optional[str],
        chord_confidence: float,
        finger_placement: Optional[Dict[str, Dict[str, Any]]],
        audio_result: AudioChordResult,
        hand_detected: bool,
        timing_warning: Optional[str] = None,
    ) -> PracticeFeedback:
        visual_chord = normalize_chord_name(predicted_chord or "")
        variants = EXPECTED_FINGERINGS.get(visual_chord)

        if not hand_detected or not finger_placement:
            return self._build_feedback(
                target_chord=visual_chord or "Unknown",
                status="no_hand_detected",
                overall_score=0,
                placement_correct=False,
                audio_correct=False,
                predicted_chord=predicted_chord,
                chord_confidence=chord_confidence,
                audio_result=audio_result,
                summary="I cannot see your fretting hand clearly.",
                instruction="Move your fretting hand and the first five frets into the camera guide.",
                finger_feedback=[],
                timing_warning=timing_warning,
            )

        if not visual_chord or variants is None or chord_confidence < 0.50:
            return self._build_feedback(
                target_chord=visual_chord or "Unknown",
                status="no_chord_detected",
                overall_score=0,
                placement_correct=False,
                audio_correct=False,
                predicted_chord=predicted_chord,
                chord_confidence=chord_confidence,
                audio_result=audio_result,
                summary="No supported chord shape is stable yet.",
                instruction="Hold one chord shape steady, then strum once.",
                finger_feedback=[],
                timing_warning=timing_warning,
            )

        finger_feedback, placement_score = self._best_variant_feedback(
            variants, finger_placement
        )
        placement_consistent = placement_score >= 0.65
        audio_chord = normalize_chord_name(audio_result.predicted_chord or "")
        audio_agrees = (
            audio_result.audio_detected
            and audio_result.confidence >= 0.45
            and audio_chord == visual_chord
        )

        if not placement_consistent:
            status = "no_chord_detected"
            summary = "The hand shape is not stable enough to identify."
            instruction = "Keep the chord inside the guide and hold the shape steady."
        elif not audio_result.audio_detected:
            status = "need_audio"
            summary = f"Your hand looks closest to {visual_chord}."
            instruction = "Strum once near the microphone to confirm the chord."
        elif audio_agrees:
            status = "recognized"
            summary = f"You are playing {visual_chord}."
            instruction = f"Chord detected: {visual_chord}."
        else:
            status = "check_tuning_or_strum"
            summary = f"Your hand looks like {visual_chord}, but the sound does not match."
            instruction = (
                f"Your finger placement looks like {visual_chord}, but the sound seems off. "
                "Make sure every required string rings clearly and tune the guitar."
            )

        overall_score = int(
            round((placement_score * 0.65 + (1.0 if audio_agrees else 0.0) * 0.35) * 100)
        )
        return self._build_feedback(
            target_chord=visual_chord,
            status=status,
            overall_score=overall_score,
            placement_correct=placement_consistent,
            audio_correct=audio_agrees,
            predicted_chord=predicted_chord,
            chord_confidence=chord_confidence,
            audio_result=audio_result,
            summary=summary,
            instruction=instruction,
            finger_feedback=finger_feedback,
            timing_warning=timing_warning,
        )

    def with_status(
        self,
        feedback: PracticeFeedback,
        status: str,
        overall_score: int,
        frames_considered: int,
    ) -> PracticeFeedback:
        feedback.status = status
        feedback.stable_status = status
        feedback.overall_score = overall_score
        feedback.frames_considered = frames_considered
        return feedback

    def _build_feedback(
        self,
        target_chord: str,
        status: str,
        overall_score: int,
        placement_correct: bool,
        audio_correct: bool,
        predicted_chord: Optional[str],
        chord_confidence: float,
        audio_result: AudioChordResult,
        summary: str,
        instruction: str,
        finger_feedback: List[FingerFeedback],
        timing_warning: Optional[str],
    ) -> PracticeFeedback:
        return PracticeFeedback(
            target_chord=target_chord,
            status=status,
            raw_status=status,
            stable_status=status,
            overall_score=overall_score,
            placement_correct=placement_correct,
            audio_correct=audio_correct,
            predicted_chord=predicted_chord,
            chord_confidence=chord_confidence,
            audio_predicted_chord=audio_result.predicted_chord,
            audio_confidence=audio_result.confidence,
            summary=summary,
            instruction=instruction,
            timing_warning=timing_warning,
            frames_considered=1,
            finger_feedback=finger_feedback,
            audio_message=audio_result.message,
            pitch_classes=audio_result.pitch_classes,
        )

    def _best_variant_feedback(
        self,
        variants: List[Fingering],
        actual: Dict[str, Dict[str, Any]],
    ) -> Tuple[List[FingerFeedback], float]:
        best_feedback: List[FingerFeedback] = []
        best_score = -1.0
        for variant in variants:
            feedback = self._score_fingers(variant, actual)
            score = sum(self._finger_score(item) for item in feedback) / max(1, len(feedback))
            if score > best_score:
                best_score = score
                best_feedback = feedback
        return best_feedback, max(0.0, best_score)

    def _score_fingers(
        self,
        expected: Fingering,
        actual: Dict[str, Dict[str, Any]],
    ) -> List[FingerFeedback]:
        feedback = []
        for finger, expected_position in expected.items():
            actual_position = actual.get(finger, {})
            expected_string = expected_position["string"]
            expected_fret = expected_position["fret"]
            actual_string = int(actual_position.get("string", 0))
            actual_fret = int(actual_position.get("fret", 0))

            correct = actual_string == expected_string and actual_fret == expected_fret
            if correct:
                message = f"{finger} finger is correctly placed."
            elif actual_string == expected_string and abs(actual_fret - expected_fret) <= 1:
                message = f"Slide your {finger} finger to fret {expected_fret} on string {expected_string}."
            elif actual_fret == expected_fret and actual_string != 0:
                message = f"Move your {finger} finger to string {expected_string} on fret {expected_fret}."
            elif actual_string == 0 or actual_fret == 0:
                message = f"Place your {finger} finger on string {expected_string}, fret {expected_fret}."
            else:
                message = (
                    f"Move your {finger} finger from string {actual_string}, fret {actual_fret} "
                    f"to string {expected_string}, fret {expected_fret}."
                )

            feedback.append(
                FingerFeedback(
                    finger=finger,
                    expected_string=expected_string,
                    expected_fret=expected_fret,
                    actual_string=actual_string,
                    actual_fret=actual_fret,
                    correct=correct,
                    message=message,
                )
            )
        return feedback

    def _finger_score(self, item: FingerFeedback) -> float:
        if item.correct:
            return 1.0
        if item.actual_string == item.expected_string and abs(item.actual_fret - item.expected_fret) <= 1:
            return 0.6
        if item.actual_fret == item.expected_fret and item.actual_string != 0:
            return 0.4
        return 0.0

    def _finger_placement_instruction(self, finger_feedback: List[FingerFeedback]) -> str:
        if not finger_feedback:
            return "Check that each finger is pressing the expected string and fret."
        placements = [
            f"{item.finger.capitalize()}: string {item.expected_string}, fret {item.expected_fret}."
            for item in finger_feedback
        ]
        return "Place your fingers as follows: " + " ".join(placements)
