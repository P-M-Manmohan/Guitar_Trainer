from collections import Counter, deque
from dataclasses import dataclass
from typing import Deque, Dict, Tuple


@dataclass
class PracticeSample:
    target_chord: str
    status: str
    overall_score: int


class PracticeSessionSmoother:
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self._windows: Dict[Tuple[str, str], Deque[PracticeSample]] = {}

    def smooth(
        self,
        session_id: str,
        target_chord: str,
        status: str,
        overall_score: int,
    ) -> Tuple[str, int, int]:
        key = (session_id, target_chord)
        window = self._windows.setdefault(key, deque(maxlen=self.window_size))
        window.append(
            PracticeSample(
                target_chord=target_chord,
                status=status,
                overall_score=overall_score,
            )
        )

        status_counts = Counter(sample.status for sample in window)
        stable_status, _ = status_counts.most_common(1)[0]
        stable_scores = [
            sample.overall_score
            for sample in window
            if sample.status == stable_status
        ]
        stable_score = int(round(sum(stable_scores) / max(1, len(stable_scores))))

        return stable_status, stable_score, len(window)
