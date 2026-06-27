import os
import urllib.request

def download_test_data():
    base_url = "https://raw.githubusercontent.com/P-M-Manmohan/Guitar_Trainer/main/ml-service/test_data/"
    target_dir = os.path.join(os.path.dirname(__file__), "test_data")
    
    # Create test_data directory if it doesn't exist
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"Created directory: {target_dir}")
        
    files = [
        "A_1.jpeg", "A_2.jpeg", "A_3.jpeg",
        "Am_1.jpeg", "Am_2.jpeg", "Am_3.jpeg", "Am_4.jpeg",
        "C_1.jpeg", "C_2.jpeg", "C_3.jpeg", "C_4.jpeg",
        "D_1.jpeg", "D_2.jpeg", "D_3.jpeg", "D_4.jpeg",
        "Dm_1.jpeg", "Dm_2.jpeg", "Dm_3.jpeg", "Dm_4.jpeg",
        "E_1.jpeg", "E_2.jpeg", "E_3.jpeg",
        "Em_1.jpeg", "Em_2.jpeg", "Em_3.jpeg",
        "F_1.jpeg", "F_2.jpeg", "F_3.jpeg", "F_4.jpeg", "F_5.jpeg",
        "Full_G_1.jpeg", "Full_G_2.jpeg", "Full_G_3.jpeg",
        "G_1.jpeg", "G_2.jpeg", "G_3.jpeg", "G_4.jpeg"
    ]
    
    print(f"Starting download of {len(files)} test images...")
    for filename in files:
        url = base_url + filename
        target_path = os.path.join(target_dir, filename)
        print(f"Downloading {filename}...", end="", flush=True)
        try:
            urllib.request.urlretrieve(url, target_path)
            print(" Done.")
        except Exception as e:
            print(f" Error: {e}")
            
    print("Download completed successfully!")

if __name__ == "__main__":
    download_test_data()
