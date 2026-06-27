import subprocess
import sys

def run_cmd(cmd):
    print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.stdout:
        print("STDOUT:")
        print(res.stdout)
    if res.stderr:
        print("STDERR:")
        print(res.stderr)
    return res.returncode

# Add all files (excluding ignored files in .gitignore)
run_cmd(["git", "add", "."])

# Commit with a message
commit_msg = sys.argv[1] if len(sys.argv) > 1 else "docs: update testing instructions, pin mediapipe, and add ML handover details"
run_cmd(["git", "commit", "-m", commit_msg])

# Push to the remote branch
run_cmd(["git", "push"])
