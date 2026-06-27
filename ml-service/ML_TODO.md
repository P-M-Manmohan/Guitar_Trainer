# ML Service Handover & TODO Guide

This document outlines the incomplete features, missing pipelines, and next steps for developers collaborating on the Machine Learning & Computer Vision service.

---

## 📋 Outstanding Tasks

### 1. Train the ML Chord Classifier (`chord_classifier.pkl`)
* **Current Status**: The service tries to load a pre-trained model file at `app/models/chord_classifier.pkl` (see [fingering_classifier.py](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/vision/fingering_classifier.py#L15-L30)). If it is missing, it falls back to a basic hand-coded heuristic rule (`_heuristic_predict`) to detect C, G, and Em.
* **What is missing**:
  - **Data Collection Script**: A script to capture and record hand landmarks (using MediaPipe) for various chords played by users to create a training dataset.
  - **Training Script**: A Python script to load the collected coordinates, split them into training/testing sets, fit the `RandomForestClassifier` (already defined in [fingering_classifier.py](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/vision/fingering_classifier.py#L76-L85)), and dump the output to `app/models/chord_classifier.pkl`.
* **Where to code**:
  - Create a dataset collection helper in `ml-service/scripts/collect_data.py`.
  - Create a training script `ml-service/scripts/train_model.py`.

### 2. Dynamic Fretboard Calibration (`fretboard_detection.py`)
* **Current Status**: [fretboard_detection.py](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/vision/fretboard_detection.py#L21-L49) defines a Hough Line detector (`detect_neck_lines`) to find the lines of the guitar neck, but it is currently **unused**. The mapping system (`map_finger_to_string_and_fret`) relies on a static bounding box (`default_neck_bbox`).
* **What is missing**:
  - Integrate the detected line results from `detect_neck_lines` into `map_finger_to_string_and_fret` so the bounding box adjusts dynamically when the camera angle or guitar position shifts.
  - Alternatively, create a calibration wizard or coordinate configuration overlay in the frontend, allowing users to align the neck bounds.
* **Where to code**:
  - Refactor `map_finger_to_string_and_fret` in [fretboard_detection.py](file:///c:/Users/angel/projects/Guitar_Trainer/ml-service/app/vision/fretboard_detection.py#L50-L101).

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
