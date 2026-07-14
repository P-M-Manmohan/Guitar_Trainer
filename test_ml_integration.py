import base64
import requests
import json
from pathlib import Path

# Config
IMAGE_PATH = Path("./ml-service/test_guitar_hand.png")
BACKEND_URL = "http://localhost:8088/ml/analyze-practice"

def run_image_test():
    print("\n====================================================")
    print("Test 1: Vision Frame + DB Lookup Integration Test")
    print("====================================================")
    
    if not IMAGE_PATH.exists():
        print(f"Error: Test image not found at {IMAGE_PATH}")
        return
        
    print(f"Reading test image: {IMAGE_PATH}...")
    with open(IMAGE_PATH, "rb") as f:
        img_bytes = f.read()
        
    encoded_image = base64.b64encode(img_bytes).decode("utf-8")
    
    # Construct PracticeAnalysisRequest payload
    payload = {
        "mode": "free",
        "image": f"data:image/png;base64,{encoded_image}",
        "image_format": "encoded"
    }
    
    print(f"Sending frame to backend at {BACKEND_URL}...")
    try:
        response = requests.post(BACKEND_URL, json=payload)
        print(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            res_json = response.json()
            print("\nVision Frame Results:")
            print(f"  Hand Detected: {res_json.get('hand_detected')}")
            print(f"  Predicted Chord: {res_json.get('predicted_chord')}")
            print(f"  Summary: {res_json.get('summary')}")
        else:
            print("Error details:")
            print(response.text)
            
    except Exception as e:
        print(f"Connection failed: {e}")

def run_mock_db_test():
    print("\n====================================================")
    print("Test 2: Direct Database Chord Shape Matching Test")
    print("====================================================")
    
    # Mocking a perfect C Major placement:
    # - Index finger (1) on B string (2), fret 1
    # - Middle finger (2) on D string (4), fret 2
    # - Ring finger (3) on A string (5), fret 3
    mock_finger_placement = {
        "index": {
            "string": 2,
            "fret": 1,
            "x": 0.0,
            "y": 0.0
        },
        "middle": {
            "string": 4,
            "fret": 2,
            "x": 0.0,
            "y": 0.0
        },
        "ring": {
            "string": 5,
            "fret": 3,
            "x": 0.0,
            "y": 0.0
        },
        "pinky": {
            "pressed": False
        }
    }
    
    # Generate a tiny dummy base64 pixel so the ML validator passes the request structure
    dummy_pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    payload = {
        "mode": "free",
        "image": f"data:image/png;base64,{dummy_pixel}",
        "image_format": "encoded",
        "target_chord": "C Major"
    }
    
    # Since we want to bypass the ML model and test the backend match_chord service directly,
    # let's call the backend but we'll mock the intermediate payload returned from the ML service.
    # Wait, the Rust backend forwards the payload to the ML service and receives a response from the ML service,
    # then does the matching on that response.
    # If we call the Rust backend, it will send the dummy pixel to the ML service, which will return no hand detected.
    # So to test the backend's database matching service, we can test it directly!
    # How? Let's check the ML service API. 
    # If we want to test the DB matching, we can send a POST request with the mock finger placement!
    # Wait! In ml.rs, it receives the response from the ML service:
    # let response = match request.send().await ...
    # And then:
    # if let Some(finger_placement) = body.get("finger_placement") { ... match_chord ... }
    # So we need the ML service to return the mock finger placement, OR we can mock it by calling the ML service or 
    # we can see what the backend does.
    # Wait! If we send the payload to the ML service, it doesn't support mocking finger placement.
    # But wait, can we write a tiny python script or run a query to verify database matching?
    # Yes! Let's print out what database shapes match `_32_1_` in the postgres database!
    # We can connect to the database container directly via Python (which is running on port 5445) and query it!
    # Let's run a SELECT query in Python connecting to port 5445 to see if our seeded C major chord is found!
    
    import psycopg
    DATABASE_URL = "postgresql://guitar:guitar_secret@localhost:5445/guitar_dev"
    
    print(f"Connecting to database at {DATABASE_URL}...")
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Query our matching logic shape: fingers LIKE '_32_1_' AND frets LIKE '_32_1_'
                cur.execute("""
                    SELECT c.key, c.suffix, cp.frets, cp.fingers
                    FROM chord_positions cp
                    JOIN chords c ON cp.chord_id = c.id
                    WHERE cp.fingers LIKE '_32_1_' AND cp.frets LIKE '_32_1_'
                """)
                rows = cur.fetchall()
                print(f"Found {len(rows)} database matches for shape '_32_1_':")
                for row in rows:
                    print(f"  Chord: {row[0]} {row[1]} | Frets: {row[2]} | Fingers: {row[3]}")
    except Exception as e:
        print(f"Database query failed: {e}")

if __name__ == "__main__":
    run_image_test()
    run_mock_db_test()
