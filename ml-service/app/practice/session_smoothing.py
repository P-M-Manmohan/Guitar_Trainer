from collections import Counter, deque
from dataclasses import dataclass
from threading import Lock
from time import monotonic
from typing import Deque, Dict, Tuple


@dataclass
class PracticeSample:
    target_chord: str
    status: str
    overall_score: int


class PracticeSessionSmoother:
    def __init__(
        self,
        window_size: int = 5,
        session_ttl_seconds: int = 30 * 60,
        max_sessions: int = 1000,
    ):
        self.window_size = window_size
        self.session_ttl_seconds = session_ttl_seconds
        self.max_sessions = max_sessions
        self._windows: Dict[Tuple[str, str], Deque[PracticeSample]] = {}
        self._last_seen: Dict[Tuple[str, str], float] = {}
        self._last_cleanup = 0.0
        self._lock = Lock()

    def smooth(
        self,
        session_id: str,
        target_chord: str,
        status: str,
        overall_score: int,
    ) -> Tuple[str, int, int]:
        key = (session_id, target_chord)
        now = monotonic()
        with self._lock:
            self._cleanup(now)
            window = self._windows.setdefault(key, deque(maxlen=self.window_size))
            self._last_seen[key] = now
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

    def _cleanup(self, now: float) -> None:
        if now - self._last_cleanup < 60 and len(self._windows) < self.max_sessions:
            return

        expired = [
            key
            for key, last_seen in self._last_seen.items()
            if now - last_seen > self.session_ttl_seconds
        ]
        for key in expired:
            self._windows.pop(key, None)
            self._last_seen.pop(key, None)

        overflow = len(self._windows) - self.max_sessions + 1
        if overflow > 0:
            oldest = sorted(self._last_seen, key=self._last_seen.get)[:overflow]
            for key in oldest:
                self._windows.pop(key, None)
                self._last_seen.pop(key, None)

        self._last_cleanup = now
