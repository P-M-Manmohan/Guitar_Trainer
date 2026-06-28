# ML Service Handover & TODO Guide

This document outlines the incomplete features, missing pipelines, and next steps for developers collaborating on the Machine Learning & Computer Vision service.

---

## 📋 Outstanding Tasks

### 1. Train the ML Chord Classifier (`chord_classifier.pkl`)
* **Current Status**: Implemented. The service still loads `app/models/chord_classifier.pkl` when present and falls back to `_heuristic_predict` if it is missing or invalid.
* **Completed work**:
  - **Data Collection Script**: `scripts/collect_data.py` captures MediaPipe hand landmarks from a webcam and appends labeled rows to `data/chord_landmarks.csv`.
  - **Training Script**: `scripts/train_model.py` loads collected landmarks, extracts the existing 63-value normalized feature vector, performs a holdout evaluation, trains a `RandomForestClassifier`, and saves `app/models/chord_classifier.pkl`.
* **Example commands**:
  ```bash
  python scripts/collect_data.py --chord G --samples 100
  python scripts/train_model.py --input data/chord_landmarks.csv
  ```
* **Where to code**:
  - Create a dataset collection helper in `ml-service/scripts/collect_data.py`.
  - Create a training script `ml-service/scripts/train_model.py`.

### 2. Dynamic Fretboard Calibration (`fretboard_detection.py`)
* **Current Status**: Implemented. `fretboard_detection.py` now estimates a dynamic neck quadrilateral with `detect_neck_bbox`, and `map_finger_to_string_and_fret` can use that dynamic calibration.
* **Completed work**:
  - The `/process-frame` route passes the decoded frame into `analyze_hand_placement`.
  - Manual `neck_bbox` values from the frontend still take priority.
  - If dynamic line detection is weak, the code falls back to `default_neck_bbox`.
* **Future frontend option**:
  - A calibration overlay is still a good user-experience improvement because it gives players a reliable manual fallback in difficult lighting or camera angles.

---

## 🛠️ How to Test Current Setup

1. Run component sanity tests:
   ```bash
   python test_service.py
   ```
2. Start the FastAPI development server:
   ```bash
   python -m app.main
   ```
3. Run integration tests (sends a sample frame to the server):
   ```bash
   python send_frame.py test_guitar_hand.png
   ```

---

## 📂 Core Reference Files
* **Vision & Detection Pipeline**: [app/vision/](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/vision/)
* **FastAPI Server Routes**: [app/api/routes.py](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/api/routes.py)
* **API Validation Schemas**: [app/api/schemas.py](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/api/schemas.py)
