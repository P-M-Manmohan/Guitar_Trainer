# Live Practice ML Integration

## Backend changes

The backend now exposes `POST /ml/analyze-practice`. It is a thin JSON proxy to
`POST {AI_SERVICE_URL}/api/analyze-practice`; all computer-vision and audio
inference stays in `ml-service`.

Changed backend files:

- `src/handlers/ml.rs`: forwards the request, preserves the ML response status,
  and returns HTTP 502 when the ML service cannot be reached or returns invalid JSON.
- `src/routes/ml.rs`: registers `POST /ml/analyze-practice`.
- `src/handlers/mod.rs` and `src/routes/mod.rs`: export the new modules.
- `src/config.rs`: loads the ML service URL and optional API key.
- `src/main.rs`: creates one reusable `reqwest::Client` with a 10-second timeout
  and adds it to shared application state.
- `.env`: points local development at ML port 8000.

No video file is uploaded through this endpoint. The Android client sends one
small RGB frame and the newest one-second mono PCM audio chunk per inference
request. Practice recordings remain local to the device.

## Environment

```env
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_KEY=
```

`AI_SERVICE_KEY` is optional. When set, the proxy sends it to the ML service as
the `x-api-key` header. The current ML service does not enforce this header yet.

## Request shape

```json
{
  "mode": "selected",
  "session_id": "device-session-id",
  "target_chord": "C",
  "image": "base64-rgb-bytes",
  "image_format": "rgb",
  "image_width": 216,
  "image_height": 384,
  "audio": "base64-signed-16-bit-pcm",
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

Use `mode: "free"` and omit `target_chord` and `expected_fingerings` for Home
screen free practice.

## Response fields used by Android

- `status`, `raw_status`, `stable_status`, and `frames_considered` control
  debounced feedback.
- `target_chord` is the selected or recognized chord.
- `placement_correct` and `audio_correct` describe the two inference branches.
- `summary` and `instruction` contain user-facing feedback.

The client waits for three consistent samples and displays relevant feedback for
five seconds. The ML service currently supports free recognition for the nine
classes in its trained model: A, Am, C, D, Dm, E, Em, F, and G. Selected-chord
audio matching supports all major, minor, and diminished roots, but reliable
visual recognition of additional chord shapes requires new labeled training data.

## Local startup order

1. Start PostgreSQL and Redis as required by the existing backend.
2. Run the ML service on port 8000.
3. Run the Rust backend on port 8080.
4. Start the Android development build and Metro from `guitar-frontend`.

The phone and development computer must be on the same network. The frontend
derives the Expo development host automatically; production builds should set
`EXPO_PUBLIC_API_BASE_URL` to the deployed HTTPS backend URL.
