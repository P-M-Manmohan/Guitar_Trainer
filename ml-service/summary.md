# Guitar Trainer Machine Learning Service

This service provides real-time computer vision and machine learning analysis for the Guitar Trainer application. It is a Python-based backend that processes camera frames to detect hands, extract 3D landmarks, map fingers to guitar strings/frets, and recognize chord shapes.

---

## 🛠️ Architecture & Modules

```mermaid
graph TD
    Frame[Camera/Image Frame] -->|Base64 POST| API[FastAPI Web Endpoint]
    Audio[Mobile Mic WAV Clip] -->|Optional Base64 POST| API
    API -->|Decode BGR| MT[MediaPipe Hand Tracker]
    MT -->|21 3D Landmarks| FD[Fretboard Detector]
    MT -->|Normalized Landmarks| FC[Chord Classifier]
    Audio --> AC[Audio Chord Analyzer]
    FD -->|Hough Line Transform| Map[Finger-to-String/Fret Mapper]
    FC -->|Random Forest / Heuristic| Class[Chord Prediction]
    Map & Class & AC --> Practice[Practice Feedback Evaluator]
    Practice -->|JSON Response| Client[Client App]
```

The service is structured as follows:

```text
ml-service/
├── requirements.txt         # Python dependencies (FastAPI, MediaPipe, OpenCV, scikit-learn)
├── summary.md               # This documentation file
├── test_service.py          # Sanity check/validation script
├── ML_TODO.md               # Handover guide detailing what is incomplete
└── app/
    ├── __init__.py          # App package initialization
    ├── main.py              # FastAPI application entrypoint & CORS setup
    ├── api/
    │   ├── __init__.py
    │   ├── routes.py        # API routing (/health, /process-frame, /analyze-practice)
    │   └── schemas.py       # Pydantic request/response validation schemas
    ├── audio/
    │   └── chord_audio.py    # Lightweight FFT/chroma audio chord matching
    ├── practice/
    │   └── chord_feedback.py # Target-chord placement/audio feedback rules
    └── vision/
        ├── __init__.py
        ├── hand_tracking.py # MediaPipe Hands integration (extracts 21 3D landmarks)
        ├── fingering_classifier.py  # Scale-invariant feature extraction & Chord classification
        └── fretboard_detection.py   # Guitar neck line detection & finger-to-string/fret mapping
```

### 1. Vision & ML Pipeline (`app/vision/`)
* **Hand Tracking (`hand_tracking.py`)**: Uses the current MediaPipe Tasks Hand Landmarker with the bundled official model and CPU inference to capture 21 distinct 3D landmarks (coordinates $x, y, z$). Tracker creation is lazy so the API health endpoint remains available if native model initialization fails.
* **Fingering Classifier (`fingering_classifier.py`)**:
  * Translates coordinates relative to the wrist (landmark 0) and normalizes them by scale to ensure accuracy regardless of hand size or camera distance.
  * Predicts chord shapes using a scikit-learn Random Forest model.
  * Falls back to a robust rule-based heuristic classifier if no trained ML model is loaded (supports G Major, C Major, and E Minor).
* **Fretboard Detection (`fretboard_detection.py`)**:
  * Employs OpenCV Hough Line Transforms to detect guitar neck edges/lines.
  * Maps normalized finger coordinates to specific string numbers (1-6) and fret numbers (0-5, where 0 is open).
* **Audio Chord Analysis (`audio/chord_audio.py`)**:
  * Accepts short base64 WAV, signed 16-bit PCM, or float32 PCM audio from the mobile microphone.
  * Uses FFT energy folded into pitch classes to compare the sound against supported beginner chord triads.
  * Matches all 12 roots in major, minor, and diminished qualities and returns the closest chord, confidence, and strongest pitch classes.
  * Rejects oversized clips and unsupported formats with frontend-actionable messages.
* **Live Practice Feedback (`practice/chord_feedback.py`)**:
  * In `selected` mode, compares the chosen chord's backend fingering data against detected placement and audio.
  * In `free` mode, identifies supported chords only when the visual classifier, geometric placement, and audio agree.
  * Supports common alternate fingerings for beginner chords instead of forcing one exact hand shape.
  * Produces a machine-readable status such as `correct`, `fix_fingering`, `check_tuning_or_strum`, `need_audio`, `resync_audio_video`, or `no_hand_detected`.
  * Returns short instructions suitable for a frontend flashcard, banner, or camera overlay.
* **Session Smoothing (`practice/session_smoothing.py`)**:
  * Uses an optional frontend `session_id` to smooth repeated live-practice responses over a short rolling window.
  * Helps prevent flickering feedback from one noisy camera frame or audio clip.

### 2. FastAPI Web Layer (`app/api/`)
* **API Schemas (`schemas.py`)**: Defines Pydantic data schemas. Client requests send a base64 encoded camera frame (JPEG/PNG) and optionally custom guitar neck coordinates.
* **Routes (`routes.py`)**:
  * `GET /api/health`: Confirms the service status.
  * `POST /api/process-frame`: Processes raw base64 frame, runs the detection pipeline, and returns whether a hand is detected, the 3D landmarks, the predicted chord with confidence, and individual finger-to-fret mappings.
  * `POST /api/analyze-practice`: Processes either selected-chord or free-practice mode using a raw RGB frame and optional WAV/raw PCM clip, then returns combined placement and sound feedback.

### 3. Live Mobile Practice Flow
The Android frontend captures a 216 x 384 RGB frame at 1 FPS and the newest one-second 16 kHz mono PCM audio window, then sends them through the backend to the ML service:

```json
{
  "session_id": "practice-session-123",
  "mode": "selected",
  "target_chord": "C",
  "image": "base64 raw RGB bytes",
  "image_format": "rgb",
  "image_width": 216,
  "image_height": 384,
  "audio": "base64 signed 16-bit PCM",
  "audio_format": "pcm_s16le",
  "audio_sample_rate": 16000,
  "audio_channels": 1,
  "expected_fingerings": [{
    "index": {"string": 2, "fret": 1},
    "middle": {"string": 4, "fret": 2},
    "ring": {"string": 5, "fret": 3}
  }]
}
```

The response includes `status`, `raw_status`, `stable_status`, `overall_score`, `summary`, `instruction`, per-finger feedback, timing warnings, and audio feedback. Recommended UI mapping:
* `correct`: show a positive confirmation.
* `fix_fingering`: show the returned `instruction` near the chord diagram or camera preview.
* `check_tuning_or_strum`: tell the user the shape looks close, but the guitar may need tuning or the strum may be muted.
* `need_audio`: ask for a clear strum.
* `resync_audio_video`: capture/send audio and video closer together in time.
* `no_hand_detected`: ask the user to move the fretting hand into the camera view.

The current Android integration is already wired to this contract. It sends inference samples only while separately saving the full MP4 and WAV practice recording on the device.

---

## 🚀 How to Run the Service

### 1. Install Dependencies
Run the following command in the `ml-service` folder:
```bash
pip install -r requirements.txt
```

### 2. Run Local Validation Tests
Verify that all vision and math modules load correctly using the validation script:
```bash
python -m unittest discover -s tests -v
```

### 3. Start the Web Server
Launch the FastAPI development server as a Python module from the `ml-service` folder:
```bash
python -m app.main
```
Or run it via `uvicorn` directly:
```bash
uvicorn app.main:app --reload --port 8000
```
The interactive API documentation will be available locally at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
