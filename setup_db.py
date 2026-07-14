import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

CHORD_DB_ZIP_URL = "https://github.com/szaza/guitar-chords-db-json/archive/refs/heads/master.zip"
ZIP_FILE_NAME = "chord_db.zip"
TARGET_DIR = Path("./guitar-backend/guitar-chords-db-json")

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

    # 2. Extract directly to target directory
    print("Extracting chord database directly to target folder...")
    try:
        if TARGET_DIR.exists():
            try:
                shutil.rmtree(TARGET_DIR)
            except Exception as e:
                print(f"Warning: Could not clear existing target dir: {e}")
        TARGET_DIR.mkdir(parents=True, exist_ok=True)
        
        with zipfile.ZipFile(ZIP_FILE_NAME, 'r') as zip_ref:
            for member in zip_ref.infolist():
                # Path parts: e.g. "guitar-chords-db-json-master/C/C_maj.json"
                parts = Path(member.filename).parts
                if len(parts) > 1:
                    # Strip the first part ("guitar-chords-db-json-master")
                    rel_path = Path(*parts[1:])
                    target_path = TARGET_DIR / rel_path
                    
                    if member.is_dir():
                        target_path.mkdir(parents=True, exist_ok=True)
                    else:
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        with zip_ref.open(member) as source, open(target_path, "wb") as target:
                            shutil.copyfileobj(source, target)
                            
        print("Extraction complete.")
    except Exception as e:
        print(f"Error extracting ZIP file: {e}")
        return
    finally:
        # 3. Clean up zip file
        print("Cleaning up zip file...")
        if os.path.exists(ZIP_FILE_NAME):
            try:
                os.remove(ZIP_FILE_NAME)
            except Exception as e:
                print(f"Warning: Could not delete zip: {e}")

    # 4. Run the seeding script
    print("Seeding database (running seed.py)...")
    if Path("seed.py").exists():
        try:
            import seed
            # Reload module in case it was imported before
            import importlib
            importlib.reload(seed)
            seed.main()
            print("Database successfully seeded!")
        except Exception as e:
            print(f"Error running seed.py: {e}")
            print("Please ensure your local PostgreSQL database is running and accessible at:")
            print("postgresql://guitar:guitar_secret@localhost:5433/guitar_dev")
    else:
        print("Warning: seed.py not found in the root directory. Skipping automatic seed.")

if __name__ == "__main__":
    main()
