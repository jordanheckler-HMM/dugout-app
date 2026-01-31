#!/bin/bash
# Provide permissions
chmod +x scripts/build_sidecar.sh

# Create binaries directory
mkdir -p src-tauri/binaries

# Get absolute path to backend
BACKEND_DIR="$(pwd)/../backend"
TARGET_DIR="$(pwd)/src-tauri/binaries"
TARGET_TRIPLE="aarch64-apple-darwin"

echo "Building backend from $BACKEND_DIR..."

cd "$BACKEND_DIR"

# Install dependencies if needed (optional, assuming env is ready)
# pip install -r requirements.txt

# Run PyInstaller
# --onefile: Create a single executable
# --name: Name of the executable
# --clean: Clean PyInstaller cache
pyinstaller --clean --noconfirm --onefile --name backend-sidecar main.py

# Move to Tauri binaries folder with target triple
echo "Moving binary to $TARGET_DIR/backend-sidecar-$TARGET_TRIPLE"
mv dist/backend-sidecar "$TARGET_DIR/backend-sidecar-$TARGET_TRIPLE"

# Cleanup
rm -rf build dist backend-sidecar.spec

echo "Build complete."
