#!/bin/bash
# Cross-platform sidecar build. macOS, Linux, and Windows (Git Bash)
# all delegate to scripts/build_sidecar.mjs so PyInstaller flags and the
# Tauri binary name stay the same on every platform.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/build_sidecar.mjs"
