# Model Assets

- `chord_classifier.pkl` is the project Random Forest chord-shape classifier.
  It was serialized with scikit-learn 1.9.0, so `requirements.txt` pins that
  version to avoid unsafe cross-version unpickling behavior.
- `hand_landmarker.task` is Google's MediaPipe Hand Landmarker model bundle
  (`float16`, revision 1), downloaded from the official MediaPipe model bucket:
  `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.

The hand model is used through MediaPipe Tasks with the CPU delegate. Its 21
normalized hand landmarks feed the existing project classifier and fretboard
mapping code; it does not replace the project's chord classifier.
