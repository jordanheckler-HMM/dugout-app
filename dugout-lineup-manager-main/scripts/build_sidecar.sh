#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create binaries directory
mkdir -p "$PROJECT_DIR/src-tauri/binaries"

# Get absolute path to backend
BACKEND_DIR="$PROJECT_DIR/../backend"
TARGET_DIR="$PROJECT_DIR/src-tauri/binaries"
TARGET_TRIPLE="$(rustc -vV | awk '/host:/{print $2}')"
if [ -z "${TARGET_TRIPLE}" ]; then
    echo "❌ Failed to determine Rust host target triple."
    echo "Install Rust and ensure 'rustc -vV' works."
    exit 1
fi
PYI_CACHE_DIR="$BACKEND_DIR/.pyinstaller-cache"

mkdir -p "$PYI_CACHE_DIR"

echo "Building backend from $BACKEND_DIR..."

cd "$BACKEND_DIR"

# Install dependencies if needed (optional, assuming env is ready)
# pip install -r requirements.txt

# Run PyInstaller
# --onefile: Create a single executable
# --name: Name of the executable
# --clean: Clean PyInstaller cache
PYINSTALLER_CONFIG_DIR="$PYI_CACHE_DIR" pyinstaller --clean --noconfirm --onefile --name backend-sidecar main.py

# Move to Tauri binaries folder with target triple
echo "Moving binary to $TARGET_DIR/backend-sidecar-$TARGET_TRIPLE"
mv dist/backend-sidecar "$TARGET_DIR/backend-sidecar-$TARGET_TRIPLE"

# Cleanup
rm -rf build dist backend-sidecar.spec

echo "Build complete."
