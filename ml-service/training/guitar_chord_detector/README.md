# Guitar Chord Detector training bundle

This directory preserves the supplied data collection, dataset, training,
standalone detector, live webcam demo, trained model, and class mapping.

The application runtime does not import `live_cam.py` or open a server-side
webcam. Runtime inference is handled by
`app/vision/home_chord_detector.py`, using copies of the trained model and class
map under `app/models/`. This keeps mobile camera frames flowing through the
existing `/api/analyze-practice` endpoint.

Run the standalone demo from this directory so its relative assets resolve:

```bash
python live_cam.py
```
