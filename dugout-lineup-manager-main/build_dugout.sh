#!/bin/bash
set -euo pipefail

if [[ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]]; then
    echo "TAURI_SIGNING_PRIVATE_KEY must be set in the environment." >&2
    exit 1
fi

# Tauri runs the frontend build through beforeBuildCommand. Build the sidecar
# separately before invoking this helper.
npm run tauri build
