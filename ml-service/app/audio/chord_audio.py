import base64
import io
import wave
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

CHORD_TONES: Dict[str, Tuple[int, ...]] = {
    "C": (0, 4, 7),
    "D": (2, 6, 9),
    "E": (4, 8, 11),
    "F": (5, 9, 0),
    "G": (7, 11, 2),
    "A": (9, 1, 4),
    "Am": (9, 0, 4),
    "Dm": (2, 5, 9),
    "Em": (4, 7, 11),
}


@dataclass
class AudioChordResult:
    audio_detected: bool
    predicted_chord: Optional[str]
    confidence: float
    matches_target: bool
    message: str
    pitch_classes: List[str]


class ChordAudioAnalyzer:
    """
    Lightweight chord audio matcher for short mobile microphone WAV clips.

    This is not a full production transcription model. It folds FFT energy into
    pitch classes and compares that chroma vector with beginner open-chord triads.
    """

    def __init__(self, min_rms: float = 0.01, max_audio_bytes: int = 2_000_000):
        self.min_rms = min_rms
        self.max_audio_bytes = max_audio_bytes

    def analyze_base64_audio(
        self,
        audio_base64: Optional[str],
        target_chord: str,
        audio_format: str = "wav",
    ) -> AudioChordResult:
        if not audio_base64:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message="No audio clip was provided.",
                pitch_classes=[],
            )

        if audio_format.lower().strip() not in {"wav", "wave", "audio/wav", "audio/wave", "audio/x-wav"}:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message="Unsupported audio format. Send a short WAV clip or convert mobile AAC/M4A to WAV before calling ML.",
                pitch_classes=[],
            )

        try:
            samples, sample_rate = self._decode_wav(audio_base64)
        except ValueError as exc:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message=str(exc),
                pitch_classes=[],
            )

        if samples.size == 0:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message="Audio clip was empty.",
                pitch_classes=[],
            )

        rms = float(np.sqrt(np.mean(samples ** 2)))
        if rms < self.min_rms:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message="Audio was too quiet to evaluate.",
                pitch_classes=[],
            )

        chroma = self._compute_chroma(samples, sample_rate)
        if chroma.sum() <= 0:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message="Could not extract stable pitch information from audio.",
                pitch_classes=[],
            )

        predicted_chord, confidence = self._match_chord(chroma)
        normalized_target = normalize_chord_name(target_chord)
        matches_target = predicted_chord == normalized_target and confidence >= 0.45

        top_pitch_indices = np.argsort(chroma)[-4:][::-1]
        pitch_classes = [PITCH_CLASSES[idx] for idx in top_pitch_indices if chroma[idx] > 0]

        if matches_target:
            message = f"Audio matches {normalized_target}."
        elif predicted_chord:
            message = f"Audio sounds closer to {predicted_chord} than {normalized_target}."
        else:
            message = "Audio chord could not be identified."

        return AudioChordResult(
            audio_detected=True,
            predicted_chord=predicted_chord,
            confidence=confidence,
            matches_target=matches_target,
            message=message,
            pitch_classes=pitch_classes,
        )

    def _decode_wav(self, audio_base64: str) -> Tuple[np.ndarray, int]:
        raw_part = audio_base64.split(",", 1)[-1]
        try:
            audio_bytes = base64.b64decode(raw_part, validate=True)
        except Exception as exc:
            raise ValueError(f"Failed to decode audio base64: {exc}") from exc

        if len(audio_bytes) > self.max_audio_bytes:
            raise ValueError("Audio clip is too large. Send a short compressed practice clip under 2 MB.")

        try:
            with wave.open(io.BytesIO(audio_bytes), "rb") as wav_file:
                channels = wav_file.getnchannels()
                sample_width = wav_file.getsampwidth()
                sample_rate = wav_file.getframerate()
                frames = wav_file.readframes(wav_file.getnframes())
        except wave.Error as exc:
            raise ValueError(f"Audio must be a WAV clip: {exc}") from exc

        if channels <= 0 or sample_rate <= 0:
            raise ValueError("Audio clip has invalid channel count or sample rate.")

        if sample_width == 1:
            samples = np.frombuffer(frames, dtype=np.uint8).astype(np.float32)
            samples = (samples - 128.0) / 128.0
        elif sample_width == 2:
            samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        elif sample_width == 4:
            samples = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
        else:
            raise ValueError(f"Unsupported WAV sample width: {sample_width} bytes")

        if channels > 1:
            samples = samples.reshape(-1, channels).mean(axis=1)

        return samples, sample_rate

    def _compute_chroma(self, samples: np.ndarray, sample_rate: int) -> np.ndarray:
        max_duration_seconds = 2.5
        max_samples = int(sample_rate * max_duration_seconds)
        if samples.size > max_samples:
            samples = samples[-max_samples:]

        samples = samples - float(np.mean(samples))
        if samples.size < 512:
            return np.zeros(12, dtype=np.float32)

        window = np.hanning(samples.size)
        spectrum = np.abs(np.fft.rfft(samples * window))
        freqs = np.fft.rfftfreq(samples.size, d=1.0 / sample_rate)

        mask = (freqs >= 70.0) & (freqs <= 1400.0)
        freqs = freqs[mask]
        spectrum = spectrum[mask]

        if spectrum.size == 0 or float(np.max(spectrum)) <= 0:
            return np.zeros(12, dtype=np.float32)

        chroma = np.zeros(12, dtype=np.float32)
        threshold = float(np.max(spectrum)) * 0.08
        strong_bins = spectrum >= threshold

        for freq, magnitude in zip(freqs[strong_bins], spectrum[strong_bins]):
            for harmonic in range(1, 5):
                fundamental = freq / harmonic
                if fundamental < 70.0:
                    continue
                midi_note = int(round(69 + 12 * np.log2(fundamental / 440.0)))
                chroma[midi_note % 12] += float(magnitude) / harmonic

        total = float(np.sum(chroma))
        if total > 0:
            chroma /= total
        return chroma

    def _match_chord(self, chroma: np.ndarray) -> Tuple[Optional[str], float]:
        best_chord = None
        best_score = 0.0
        for chord, tones in CHORD_TONES.items():
            tone_energy = float(sum(chroma[tone] for tone in tones))
            outside_energy = max(0.0, 1.0 - tone_energy)
            score = tone_energy - outside_energy * 0.35
            if score > best_score:
                best_chord = chord
                best_score = score

        confidence = max(0.0, min(1.0, best_score))
        return best_chord, confidence


def normalize_chord_name(chord_name: str) -> str:
    normalized = chord_name.strip().replace("_", " ").replace("-", " ").lower()
    parts = normalized.split()
    if not parts:
        return ""

    root = parts[0]
    is_minor = root.endswith("m") or any(part in {"m", "min", "minor"} for part in parts[1:])
    if any(part in {"maj", "major"} for part in parts[1:]):
        is_minor = False

    if root.endswith("m"):
        root = root[:-1]

    chord = root.upper()
    if is_minor:
        chord += "m"
    return chord
