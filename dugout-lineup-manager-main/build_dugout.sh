#!/bin/bash

# Clear any previous terminal state
if [[ "$1" == "" ]]; then
    echo "❌ Error: You need to provide your Private Key."
    echo "Usage: ./build_dugout.sh \"YOUR_PRIVATE_KEY_HERE\""
    exit 1
fi

export TAURI_SIGNING_PRIVATE_KEY="$1"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

echo "🚀 Building Dugout with signing keys..."
npm run build && npx tauri build
