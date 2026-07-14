import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

CHORD_DB_ZIP_URL = "https://github.com/szaza/guitar-chords-db-json/archive/refs/heads/master.zip"
ZIP_FILE_NAME = "chord_db.zip"
TARGET_DIR = Path("./guitar-backend/guitar-chords-db-json")
TEMP_EXTRACT_DIR = Path("./temp_chord_db_extract")

def main():
    print("=== Guitar Trainer Database Setup ===")
    
    # 1. Download the ZIP file
    print(f"Downloading chord database from: {CHORD_DB_ZIP_URL}...")
    try:
        urllib.request.urlretrieve(CHORD_DB_ZIP_URL, ZIP_FILE_NAME)
        print("Download complete.")
    except Exception as e:
        print(f"Error downloading chord database: {e}")
        return

    # 2. Extract the ZIP file
    print("Extracting chord database...")
    try:
        if TEMP_EXTRACT_DIR.exists():
            shutil.rmtree(TEMP_EXTRACT_DIR)
        
        with zipfile.ZipFile(ZIP_FILE_NAME, 'r') as zip_ref:
            zip_ref.extractall(TEMP_EXTRACT_DIR)
        print("Extraction complete.")
    except Exception as e:
        print(f"Error extracting ZIP file: {e}")
        # Clean up
        if os.path.exists(ZIP_FILE_NAME):
            os.remove(ZIP_FILE_NAME)
        return

    # 3. Move the contents to the target directory
    print("Moving files to backend directory...")
    try:
        if TARGET_DIR.exists():
            shutil.rmtree(TARGET_DIR)
        TARGET_DIR.mkdir(parents=True, exist_ok=True)
        
        # The zip extracts into a folder named "guitar-chords-db-json-master"
        source_dir = TEMP_EXTRACT_DIR / "guitar-chords-db-json-master"
        
        # Check if the folder exists, otherwise look for any subdirectory
        if not source_dir.exists():
            subdirs = [x for x in TEMP_EXTRACT_DIR.iterdir() if x.is_dir()]
            if subdirs:
                source_dir = subdirs[0]
        
        if source_dir.exists():
            # Move all subdirectories (like A, B, C, etc.) and files
            for item in source_dir.iterdir():
                shutil.move(str(item), str(TARGET_DIR / item.name))
            print(f"Chord database files successfully moved to: {TARGET_DIR.resolve()}")
        else:
            print("Error: Could not locate extracted source directory.")
            return
            
    except Exception as e:
        print(f"Error moving files: {e}")
        return
    finally:
        # 4. Clean up temporary files
        print("Cleaning up temporary files...")
        if os.path.exists(ZIP_FILE_NAME):
            os.remove(ZIP_FILE_NAME)
        if TEMP_EXTRACT_DIR.exists():
            shutil.rmtree(TEMP_EXTRACT_DIR)

    # 5. Run the seeding script
    print("Seeding database (running seed.py)...")
    if Path("seed.py").exists():
        try:
            import seed
            seed.main()
            print("Database successfully seeded!")
        except Exception as e:
            print(f"Error running seed.py: {e}")
            print("Please ensure your local PostgreSQL database is running and accessible at:")
            print("postgresql://guitar:guitar_secret@localhost:5432/guitar_dev")
    else:
        print("Warning: seed.py not found in the root directory. Skipping automatic seed.")

if __name__ == "__main__":
    main()
