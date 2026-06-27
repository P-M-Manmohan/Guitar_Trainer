import shutil
import os

src = r"C:\Users\angel\.gemini\antigravity-ide\brain\572a2089-cc9d-4f28-8a8f-55e69abb552e\test_guitar_hand_1782372786471.png"
dst = "test_guitar_hand.png"

if os.path.exists(src):
    shutil.copy(src, dst)
    print(f"Successfully copied test image to {dst}!")
else:
    print("Source image not found.")
