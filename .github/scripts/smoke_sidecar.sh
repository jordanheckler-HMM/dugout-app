#!/usr/bin/env bash
# Start a built backend sidecar and require GET /health to report api=ok.
set -euo pipefail

BIN="${1:?path to backend-sidecar binary}"
PORT="${2:-8100}"
DATA_DIR="${3:-sidecar-smoke-data}"

if [[ ! -f "$BIN" ]]; then
  echo "Sidecar binary not found: $BIN"
  exit 1
fi

mkdir -p "$DATA_DIR"
LOG_DIR="$DATA_DIR"
APP_DATA_DIR="$DATA_DIR"
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    # Give the native Windows exe a Windows path. Git Bash would otherwise
    # rewrite or mis-read a Unix-style DUGOUT_DATA_DIR. Shell redirects stay
    # on the Bash path in LOG_DIR.
    APP_DATA_DIR="$(cygpath -w "$DATA_DIR")"
    ;;
esac
export MSYS2_ENV_CONV_EXCL=DUGOUT_DATA_DIR
export DUGOUT_DATA_DIR="$APP_DATA_DIR"
export DUGOUT_BACKEND_PORT="$PORT"

if curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use; refusing to start another sidecar."
  exit 1
fi

echo "Starting sidecar: $BIN"
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    "$BIN" >"$LOG_DIR/sidecar.log" 2>&1 &
    PID=$!
    ;;
  *)
    setsid "$BIN" >"$LOG_DIR/sidecar.log" 2>&1 &
    PID=$!
    ;;
esac

cleanup() {
  local uname_s
  uname_s="$(uname -s)"
  case "$uname_s" in
    MINGW* | MSYS* | CYGWIN*)
      taskkill //F //T //PID "$PID" >/dev/null 2>&1 || true
      ;;
    *)
      kill -- -"$PID" >/dev/null 2>&1 || kill "$PID" >/dev/null 2>&1 || true
      ;;
  esac
  wait "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

deadline=$((SECONDS + 90))
while (( SECONDS < deadline )); do
  if curl -fsS --max-time 15 "http://127.0.0.1:${PORT}/health" -o "$LOG_DIR/health.json" 2>/dev/null; then
    if node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); if (data.api!=="ok") process.exit(1);' "$LOG_DIR/health.json"; then
      echo
      echo "Sidecar health check passed."
      cat "$LOG_DIR/health.json"
      echo
      exit 0
    fi
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "Sidecar exited before answering /health. Log:"
    cat "$LOG_DIR/sidecar.log" || true
    exit 1
  fi
  sleep 2
done

echo "Timed out waiting for sidecar /health. Log:"
cat "$LOG_DIR/sidecar.log" || true
exit 1
