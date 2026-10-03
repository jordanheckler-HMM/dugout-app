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
BINARY_EXTENSION=""
if [[ "$TARGET_TRIPLE" == *windows* ]]; then
    BINARY_EXTENSION=".exe"
fi

echo "Building backend from $BACKEND_DIR..."

cd "$BACKEND_DIR"
BUILD_DIR="$(mktemp -d .sidecar-build.XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT

# Install dependencies if needed (optional, assuming env is ready)
# pip install -r requirements.txt

# Run PyInstaller
# --onefile: Create a single executable
# --name: Name of the executable
# --clean: Clean PyInstaller cache
pyinstaller --clean --noconfirm --onefile --name backend-sidecar \
    --workpath "$BUILD_DIR/work" --distpath "$BUILD_DIR/dist" --specpath "$BUILD_DIR" main.py

# Move to Tauri binaries folder with target triple
echo "Moving binary to $TARGET_DIR/backend-sidecar-$TARGET_TRIPLE$BINARY_EXTENSION"
mv "$BUILD_DIR/dist/backend-sidecar$BINARY_EXTENSION" "$TARGET_DIR/backend-sidecar-$TARGET_TRIPLE$BINARY_EXTENSION"

echo "Build complete."
