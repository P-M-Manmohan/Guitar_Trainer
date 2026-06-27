import base64
import requests
import json
import cv2
import numpy as np
import sys
import os

def test_api(image_path=None):
    url = "http://127.0.0.1:8000/api/process-frame"
    
    # 1. Obtain/Generate a test image
    if image_path and os.path.exists(image_path):
        print(f"Reading image from: {image_path}")
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    else:
        print("No image file specified (or file not found). Generating a dummy test image...")
        # Create a simple 640x480 gray image with a circle drawn on it
        img = np.ones((480, 640, 3), dtype=np.uint8) * 128
        cv2.putText(img, "TEST FRAME", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.circle(img, (320, 240), 50, (0, 0, 255), -1)
        
        _, buffer = cv2.imencode('.jpg', img)
        encoded_string = base64.b64encode(buffer).decode('utf-8')

    # 2. Build the request payload
    payload = {
        "image": f"data:image/jpeg;base64,{encoded_string}"
    }

    # 3. Send the POST request to the FastAPI server
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("\n--- Success! Response JSON: ---")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"\nFailed! Server returned status code: {response.status_code}")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print("\nConnection Error: Make sure your FastAPI server is running!")
        print("Run this first in a separate terminal: python app/main.py")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else None
    test_api(path)
