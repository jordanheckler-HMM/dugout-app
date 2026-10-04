#!/usr/bin/env bash
# Run the Dugout AppImage under Xvfb and require the bundled sidecar /health.
set -euo pipefail

SEARCH_ROOT="${1:-src-tauri/target}"
PORT="${2:-8100}"
LOG_DIR="${RUNNER_TEMP:-/tmp}/dugout-appimage-smoke"
mkdir -p "$LOG_DIR"

APPIMAGE="$(find "$SEARCH_ROOT" -type f -name '*.AppImage' | sort | head -n 1)"
if [[ -z "$APPIMAGE" ]]; then
  echo "No AppImage found under $SEARCH_ROOT"
  exit 1
fi

chmod +x "$APPIMAGE"
echo "Smoking AppImage: $APPIMAGE"

if curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use; refusing to start the AppImage."
  exit 1
fi

export APPIMAGE_EXTRACT_AND_RUN=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export GDK_BACKEND=x11
export LIBGL_ALWAYS_SOFTWARE=1

setsid xvfb-run -a dbus-run-session -- "$APPIMAGE" >"$LOG_DIR/appimage.log" 2>&1 &
PID=$!

cleanup() {
  kill -- -"$PID" >/dev/null 2>&1 || kill "$PID" >/dev/null 2>&1 || true
  pkill -f 'backend-sidecar' >/dev/null 2>&1 || true
  wait "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

deadline=$((SECONDS + 120))
while (( SECONDS < deadline )); do
  if curl -fsS --max-time 15 "http://127.0.0.1:${PORT}/health" -o "$LOG_DIR/health.json" 2>/dev/null; then
    if node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); if (data.api!=="ok") process.exit(1);' "$LOG_DIR/health.json"; then
      echo
      echo "AppImage sidecar health check passed."
      cat "$LOG_DIR/health.json"
      echo
      exit 0
    fi
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "AppImage exited before the sidecar answered /health. Log:"
    cat "$LOG_DIR/appimage.log" || true
    exit 1
  fi
  sleep 2
done

echo "Timed out waiting for AppImage sidecar /health. Log:"
cat "$LOG_DIR/appimage.log" || true
exit 1
