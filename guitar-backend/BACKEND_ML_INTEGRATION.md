# Live Chord Practice ML Integration

## Purpose

The backend now acts as the mobile app's gateway to the Python ML service. The
frontend sends live practice samples to the Rust backend, and the backend
forwards the JSON request to the ML service:

```text
Mobile app -> POST /ml/analyze-practice -> Rust backend
           -> POST /api/analyze-practice -> Python ML service
```

Keeping the ML service behind the backend gives the team one public API base
URL and avoids exposing the ML service URL or API key in the mobile app.

## Public Endpoint

```http
POST /ml/analyze-practice
Content-Type: application/json
```

The handler currently forwards the JSON body without reshaping it. The request
contains:

- `session_id`: identifies one practice session for temporal smoothing.
- `target_chord`: normalized chord name such as `C`, `F#m`, or `Bdim`.
- `image`: base64 packed RGB camera-frame bytes.
- `image_format`, `image_width`, `image_height`: describe the frame buffer.
- `audio`: optional base64 raw microphone PCM bytes.
- `audio_format`, `audio_sample_rate`, `audio_channels`: describe the audio.
- `expected_fingerings`: chord positions loaded from the backend chord data.
- `neck_bbox`: normalized corners of the frontend fretboard guide.

Example abbreviated request:

```json
{
  "session_id": "practice-123",
  "target_chord": "C",
  "image": "<base64-rgb>",
  "image_format": "rgb",
  "image_width": 216,
  "image_height": 384,
  "audio": "<base64-pcm>",
  "audio_format": "pcm_s16le",
  "audio_sample_rate": 16000,
  "audio_channels": 1,
  "expected_fingerings": [
    {
      "index": { "string": 2, "fret": 1 },
      "middle": { "string": 4, "fret": 2 },
      "ring": { "string": 5, "fret": 3 }
    }
  ],
  "neck_bbox": {
    "top_left": [0.08, 0.38],
    "top_right": [0.92, 0.38],
    "bottom_left": [0.08, 0.63],
    "bottom_right": [0.92, 0.63]
  }
}
```

The ML response is returned to the frontend with its original HTTP status and
JSON body. It includes stable placement/audio status, popup instructions,
confidence values, per-finger feedback, and detected pitch classes.

## Backend Implementation

- `src/handlers/ml.rs` implements the proxy handler.
- `src/routes/ml.rs` registers `POST /ml/analyze-practice`.
- `src/handlers/mod.rs` and `src/routes/mod.rs` export the new modules.
- `src/main.rs` creates one reusable `reqwest::Client` with a ten-second timeout,
  adds it to `AppState`, and merges the ML router.
- `src/config.rs` provides local defaults for the ML URL and optional API key.

The proxy sends `x-api-key` only when `AI_SERVICE_KEY` is non-empty. A network
failure, timeout, or non-JSON ML response becomes `502 Bad Gateway`. Validation
errors returned by FastAPI retain their original status and response body.

## Configuration

Local development defaults:

```env
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_KEY=
```

Docker Compose uses the internal service hostname:

```env
AI_SERVICE_URL=http://ml-service:8000
```

Do not commit a production ML API key. Provide it through the deployment
environment or secret manager.

## Docker Compose

`docker-compose.yml` now builds `../ml-service/Dockerfile`, exposes ML port
`8000`, and waits for `GET /api/health` before starting the backend.

From `guitar-backend`:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, the ML service, and the Rust backend using their
container-network addresses.

## Local Non-Docker Run

Start ML from a separate terminal:

```bash
cd ml-service
python -m app.main
```

Then start the backend after PostgreSQL and Redis are available:

```bash
cd guitar-backend
cargo run
```

Test service health and the proxy independently before mobile testing:

```bash
curl http://127.0.0.1:8000/api/health
```

The full request schema and interactive ML endpoint documentation are available
at `http://127.0.0.1:8000/docs` while the ML service is running.

## Backend Team Follow-Ups

- Add authentication and per-user/session authorization to the proxy when the
  practice workflow is tied to user accounts.
- Apply request-rate and body-size limits appropriate for roughly one frame
  every 1.2 seconds per active session.
- Add structured latency/status metrics around the upstream ML call.
- Replace the shared ML API key with workload identity or private service
  networking for production deployment.
- Add an integration test using a mock ML upstream so proxy status/error
  behavior can be tested without PostgreSQL or MediaPipe.
