# Guitar Trainer ML Service: Current Capabilities

The Machine Learning (ML) service is a Python-based computer vision backend designed to analyze live video frames and assess a player's guitar chord fingering. Here is the summary of what the service does so far:

```mermaid
graph TD
    Frame[Camera/Image Frame] -->|Base64 POST| API[FastAPI Web Endpoint]
    API -->|Decode BGR| MT[MediaPipe Hand Tracker]
    MT -->|21 3D Landmarks| FD[Fretboard Detector]
    MT -->|Normalized Landmarks| FC[Chord Classifier]
    FD -->|Hough Line Transform| Map[Finger-to-String/Fret Mapper]
    FC -->|Random Forest / Heuristic| Class[Chord Prediction]
    Map & Class -->|JSON Response| Client[Client App]
```

---

## 1. Hand Tracking & Coordinate Extraction
* **Framework**: Google MediaPipe (Version `0.10.14` legacy solutions API).
* **Process**: Captures raw camera/image frames and extracts **21 distinct 3D landmarks** corresponding to key anatomical locations of the hand (wrist, thumb joints, and the four finger joints/tips).
* **Coordinates**: Returns $x, y, z$ coordinates relative to the camera field of view.

## 2. Scale & Orientation Normalization
* **Method**: Landmarks are translated relative to the wrist (landmark 0) and scaled proportionally.
* **Why**: This ensures hand size, hand angle, and distance from the camera do not distort the chord recognition, making the model highly robust to different players and setups.

## 3. Guitar Neck & Fretboard Detection
* **Framework**: OpenCV (Hough Line Transform).
* **Process**: Analyzes line structures in the frame to identify the boundaries of the guitar neck.
* **Finger-to-Fret Mapping**: Maps 2D landmark coordinates of the fingers to:
  * **String number**: 1 to 6 (where 1 is the high E string and 6 is the low E string).
  * **Fret number**: 0 to 5 (where 0 is open/no fret pressed).

## 4. Chord Classification Engine
* **Machine Learning Model**: Includes a scikit-learn **Random Forest Classifier** trained to predict chord shapes from normalized hand landmark distances.
* **Heuristic Fallback**: If a trained model is not yet loaded, a rule-based classifier evaluates the finger placements relative to standard shapes (specifically targeting chords like **G Major**, **C Major**, and **E Minor**).
* **Outputs**: Returns the predicted chord string (or `"Unknown_or_Open"`) along with a confidence probability score.

## 5. REST API (FastAPI)
* Exposes a POST endpoint at `/api/process-frame` accepting base64 encoded images.
* Validates incoming requests and structures outgoing JSON data using **Pydantic schemas**.
* Returns whether a hand was detected, the raw coordinates, the chord classification, and the individual finger string/fret mappings in a structured payload.
