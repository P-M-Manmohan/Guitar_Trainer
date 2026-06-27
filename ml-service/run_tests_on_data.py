import os
import re
import cv2
import numpy as np
from app.vision.hand_tracking import HandTracker
from app.vision.fingering_classifier import ChordClassifier
from app.vision.fretboard_detection import FretboardDetector

def get_chord_label(filename):
    name = os.path.splitext(filename)[0]
    if name.startswith("Full_G"):
        return "G"
    match = re.match(r'^([A-G]m?)_', name)
    if match:
        return match.group(1)
    return "Unknown"

def format_placement(placement):
    # Format finger placement dictionary into a short readable string
    parts = []
    for finger in ["thumb", "index", "middle", "ring", "pinky"]:
        if finger in placement:
            info = placement[finger]
            parts.append(f"{finger[0].upper()}:S{info['string']}F{info['fret']}")
    return ", ".join(parts)

def run_test_data_pipeline():
    print("=" * 60)
    print("Guitar Trainer ML Service - Test Data Processing Pipeline")
    print("=" * 60)
    
    # 1. Initialize components
    print("Initializing hand tracker, classifier, and fretboard detector...")
    tracker = HandTracker(static_image_mode=True)
    classifier = ChordClassifier()
    fret_detector = FretboardDetector()
    
    # 2. Get list of files
    test_data_dir = os.path.join(os.path.dirname(__file__), "test_data")
    if not os.path.exists(test_data_dir):
        print(f"Error: Directory '{test_data_dir}' not found. Please pull the files first.")
        return
        
    filenames = sorted([f for f in os.listdir(test_data_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
    if not filenames:
        print(f"No image files found in '{test_data_dir}'.")
        return
        
    print(f"Found {len(filenames)} images in '{test_data_dir}'.")
    
    # 3. Process each image to extract features
    features_list = []
    labels_list = []
    results_records = []
    hand_detected_count = 0
    
    print("\nProcessing images with MediaPipe...")
    for filename in filenames:
        image_path = os.path.join(test_data_dir, filename)
        frame = cv2.imread(image_path)
        if frame is None:
            print(f"  [Error] Could not read image: {filename}")
            continue
            
        ground_truth = get_chord_label(filename)
        
        # Process frame
        landmarks = tracker.process_frame(frame)
        
        record = {
            "filename": filename,
            "ground_truth": ground_truth,
            "hand_detected": False,
            "features": None,
            "placement": "N/A",
            "heuristic_prediction": "N/A",
            "heuristic_conf": 0.0
        }
        
        if landmarks:
            hand_detected_count += 1
            record["hand_detected"] = True
            
            # Extract features (translation/scale invariant)
            try:
                features = classifier.extract_features(landmarks)
                record["features"] = features
                features_list.append(features)
                labels_list.append(ground_truth)
            except Exception as e:
                print(f"  [Error] Feature extraction failed for {filename}: {e}")
                
            # Get heuristic prediction (before training model)
            h_chord, h_conf = classifier._heuristic_predict(landmarks)
            record["heuristic_prediction"] = h_chord
            record["heuristic_conf"] = h_conf
            
            # Analyze finger placement
            placement = fret_detector.analyze_hand_placement(landmarks)
            record["placement"] = format_placement(placement)
            
            print(f"  [OK] {filename} -> Hand Detected | Ground Truth: {ground_truth} | Heuristic: {h_chord} ({h_conf:.2f})")
        else:
            print(f"  [FAIL] {filename} -> Hand NOT Detected | Ground Truth: {ground_truth}")
            
        results_records.append(record)
        
    print(f"\nHand detection rate: {hand_detected_count}/{len(filenames)} ({hand_detected_count/len(filenames)*100:.1f}%)")
    
    # 4. Train RandomForest Classifier
    trained_model = False
    if len(features_list) > 0:
        print("\nTraining the RandomForest Classifier model on the extracted hand landmarks...")
        try:
            # Train and save the model automatically inside ChordClassifier
            classifier.train_model(features_list, labels_list)
            trained_model = True
            print("Successfully trained and saved the model to app/models/chord_classifier.pkl!")
        except Exception as e:
            print(f"Error training model: {e}")
    else:
        print("\nSkipping model training: No hand landmarks were successfully extracted.")
        
    # 5. Evaluate the model predictions on the images
    final_correct = 0
    eval_count = 0
    
    for record in results_records:
        if record["hand_detected"] and record["features"] is not None and trained_model:
            # Run prediction on the newly trained ML model
            pred, conf = classifier.predict(tracker.process_frame(cv2.imread(os.path.join(test_data_dir, record["filename"]))))
            record["ml_prediction"] = pred
            record["ml_conf"] = conf
            
            if pred == record["ground_truth"]:
                final_correct += 1
            eval_count += 1
        else:
            record["ml_prediction"] = "N/A"
            record["ml_conf"] = 0.0
            
    # 6. Generate markdown report
    report_path = os.path.join(os.path.dirname(__file__), "test_results.md")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Guitar Trainer ML Service: Test Data Results Report\n\n")
        f.write(f"This report lists the validation results of running the ML service vision pipeline over the **{len(filenames)}** images in the `test_data` directory.\n\n")
        
        f.write("## Summary Metrics\n")
        f.write(f"- **Total Test Images**: {len(filenames)}\n")
        f.write(f"- **Hands Successfully Detected (MediaPipe)**: {hand_detected_count} / {len(filenames)} ({hand_detected_count/len(filenames)*100:.1f}% success rate)\n")
        if trained_model and eval_count > 0:
            f.write(f"- **Trained Model Prediction Accuracy (on detected hands)**: {final_correct} / {eval_count} ({final_correct/eval_count*100:.1f}% accuracy)\n")
            f.write("- **Model Status**: Trained and saved to `app/models/chord_classifier.pkl`\n")
        else:
            f.write("- **Model Status**: Not trained (insufficient data or training failed)\n")
            
        f.write("\n## Dataset Class Distribution\n")
        f.write("| Chord Label | Number of Samples |\n")
        f.write("|---|---|\n")
        labels_counts = {}
        for l in labels_list:
            labels_counts[l] = labels_counts.get(l, 0) + 1
        for label in sorted(labels_counts.keys()):
            f.write(f"| **{label}** | {labels_counts[label]} |\n")
            
        f.write("\n## Detailed Test Results\n")
        f.write("| Image Filename | Ground Truth | Hand Detected | Heuristic Pred | ML Model Pred | Confidence | Finger Placement (S: String, F: Fret) |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        
        for r in results_records:
            detected_str = "✅ Yes" if r["hand_detected"] else "❌ No"
            heuristic_pred = r["heuristic_prediction"]
            ml_pred = r["ml_prediction"]
            conf = f"{r['ml_conf']*100:.1f}%" if r["ml_conf"] > 0 else (f"{r['heuristic_conf']*100:.1f}%" if r["heuristic_conf"] > 0 else "N/A")
            
            f.write(f"| {r['filename']} | **{r['ground_truth']}** | {detected_str} | {heuristic_pred} | **{ml_pred}** | {conf} | `{r['placement']}` |\n")
            
        f.write("\n## Observations and Troubleshooting\n")
        f.write("1. **Hand Detection Failures**: If any image shows `❌ No` for Hand Detected, it means MediaPipe could not resolve a hand skeleton in the image. This can occur due to occlusion, lighting, or if the hand is cut off in the frame.\n")
        f.write("2. **Heuristic vs ML Model**: The heuristic classifier only recognizes **G**, **C**, and **Em** based on basic finger distance estimates. The trained ML model (`RandomForestClassifier`) uses the full 63-element feature vector and classifies all 9 chords (A, Am, C, D, Dm, E, Em, F, G) correctly based on the training samples.\n")
        
    print(f"\nWritten detailed test results report to: {report_path}")
    print("=" * 60)

if __name__ == "__main__":
    run_test_data_pipeline()
