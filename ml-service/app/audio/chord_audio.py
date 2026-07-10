import base64
import io
import re
import wave
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

FLAT_TO_SHARP = {
    "CB": "B",
    "DB": "C#",
    "EB": "D#",
    "FB": "E",
    "GB": "F#",
    "AB": "G#",
    "BB": "A#",
}


def _build_chord_tones() -> Dict[str, Tuple[int, ...]]:
    result: Dict[str, Tuple[int, ...]] = {}
    for root_index, root in enumerate(PITCH_CLASSES):
        result[root] = (root_index, (root_index + 4) % 12, (root_index + 7) % 12)
        result[f"{root}m"] = (root_index, (root_index + 3) % 12, (root_index + 7) % 12)
        result[f"{root}dim"] = (root_index, (root_index + 3) % 12, (root_index + 6) % 12)
    return result


CHORD_TONES = _build_chord_tones()


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
        sample_rate: int = 16000,
        channels: int = 1,
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

        normalized_format = audio_format.lower().strip()
        supported_formats = {
            "wav",
            "wave",
            "audio/wav",
            "audio/wave",
            "audio/x-wav",
            "pcm_s16le",
            "pcm_f32le",
        }
        if normalized_format not in supported_formats:
            return AudioChordResult(
                audio_detected=False,
                predicted_chord=None,
                confidence=0.0,
                matches_target=False,
                message="Unsupported audio format. Send WAV, signed 16-bit PCM, or float32 PCM.",
                pitch_classes=[],
            )

        try:
            if normalized_format in {"pcm_s16le", "pcm_f32le"}:
                samples = self._decode_pcm(
                    audio_base64,
                    normalized_format,
                    channels,
                )
            else:
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

        predicted_chord, confidence, chord_scores = self._match_chord(chroma)
        normalized_target = normalize_chord_name(target_chord)
        target_score = chord_scores.get(normalized_target, 0.0)
        matches_target = (
            target_score >= 0.58
            and (
                predicted_chord == normalized_target
                or confidence - target_score <= 0.06
            )
        )

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

    def _decode_pcm(
        self,
        audio_base64: str,
        audio_format: str,
        channels: int,
    ) -> np.ndarray:
        raw_part = audio_base64.split(",", 1)[-1]
        try:
            audio_bytes = base64.b64decode(raw_part, validate=True)
        except Exception as exc:
            raise ValueError(f"Failed to decode audio base64: {exc}") from exc

        if len(audio_bytes) > self.max_audio_bytes:
            raise ValueError("Audio clip is too large. Send a short practice clip under 2 MB.")
        if channels not in {1, 2}:
            raise ValueError("PCM audio must contain one or two channels.")

        dtype = "<i2" if audio_format == "pcm_s16le" else "<f4"
        bytes_per_sample = np.dtype(dtype).itemsize
        frame_size = bytes_per_sample * channels
        if not audio_bytes or len(audio_bytes) % frame_size != 0:
            raise ValueError("PCM byte length does not match its sample format and channel count.")

        samples = np.frombuffer(audio_bytes, dtype=dtype).astype(np.float32)
        if audio_format == "pcm_s16le":
            samples /= 32768.0
        if channels > 1:
            samples = samples.reshape(-1, channels).mean(axis=1)
        return np.clip(samples, -1.0, 1.0)

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
        if samples.size < 1024:
            return np.zeros(12, dtype=np.float32)

        fft_size = min(4096, 2 ** int(np.floor(np.log2(samples.size))))
        fft_size = max(1024, fft_size)
        hop_size = fft_size // 2
        starts = list(range(0, max(1, samples.size - fft_size + 1), hop_size))
        if starts[-1] != samples.size - fft_size:
            starts.append(max(0, samples.size - fft_size))

        frame_chromas = []
        freqs = np.fft.rfftfreq(fft_size, d=1.0 / sample_rate)
        mask = (freqs >= 65.0) & (freqs <= 1600.0)
        valid_freqs = freqs[mask]
        midi_notes = np.rint(69 + 12 * np.log2(valid_freqs / 440.0)).astype(int)

        for start in starts:
            frame = samples[start:start + fft_size]
            if frame.size < fft_size:
                frame = np.pad(frame, (0, fft_size - frame.size))
            if float(np.sqrt(np.mean(frame ** 2))) < self.min_rms:
                continue

            power = np.abs(np.fft.rfft(frame * np.hanning(fft_size))) ** 2
            power = np.log1p(power[mask])
            if power.size == 0 or float(np.max(power)) <= 0:
                continue

            frame_chroma = np.zeros(12, dtype=np.float32)
            for pitch_class, magnitude in zip(midi_notes % 12, power):
                frame_chroma[pitch_class] += float(magnitude)
            frame_total = float(frame_chroma.sum())
            if frame_total > 0:
                frame_chromas.append(frame_chroma / frame_total)

        if not frame_chromas:
            return np.zeros(12, dtype=np.float32)

        chroma = np.median(np.stack(frame_chromas), axis=0).astype(np.float32)
        total = float(chroma.sum())
        if total > 0:
            chroma /= total
        return chroma

    def _match_chord(
        self,
        chroma: np.ndarray,
    ) -> Tuple[Optional[str], float, Dict[str, float]]:
        best_chord = None
        best_score = 0.0
        scores: Dict[str, float] = {}
        for chord, tones in CHORD_TONES.items():
            tone_values = np.array([chroma[tone] for tone in tones], dtype=np.float32)
            tone_energy = float(tone_values.sum())
            balance = float(tone_values.min() / max(1e-6, tone_values.max()))
            outside_energy = max(0.0, 1.0 - tone_energy)
            score = tone_energy * 0.80 + balance * 0.25 - outside_energy * 0.15
            score = max(0.0, min(1.0, score))
            scores[chord] = score
            if score > best_score:
                best_chord = chord
                best_score = score

        confidence = max(0.0, min(1.0, best_score))
        return best_chord, confidence, scores


def normalize_chord_name(chord_name: str) -> str:
    normalized = chord_name.strip().replace("_", " ").replace("-", " ")
    match = re.match(r"^([A-Ga-g])([#b]?)(.*)$", normalized)
    if not match:
        return ""

    root = f"{match.group(1).upper()}{match.group(2)}"
    root = FLAT_TO_SHARP.get(root.upper(), root.upper())
    suffix = match.group(3).strip().lower()
    if suffix.startswith("dim") or "diminished" in suffix:
        return f"{root}dim"
    is_minor = suffix.startswith("m") and not suffix.startswith("maj")
    is_minor = is_minor or "minor" in suffix or suffix == "min"

    chord = root
    if is_minor:
        chord += "m"
    return chord
