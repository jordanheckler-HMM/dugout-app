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
IS_WINDOWS=false
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    IS_WINDOWS=true
    ;;
esac

if [[ "$IS_WINDOWS" == true ]]; then
  # Git Bash waits forever if a native console exe is backgrounded with &.
  # A detached Python child returns the pid immediately.
  WIN_BIN="$(cygpath -w "$BIN")"
  WIN_OUT="$(cygpath -w "$LOG_DIR/sidecar.out.log")"
  WIN_ERR="$(cygpath -w "$LOG_DIR/sidecar.err.log")"
  cat >"$LOG_DIR/start_sidecar.py" <<EOF
import subprocess
flags = 0x00000008 | 0x08000000  # DETACHED_PROCESS | CREATE_NO_WINDOW
process = subprocess.Popen(
    [r"${WIN_BIN}"],
    stdout=open(r"${WIN_OUT}", "w"),
    stderr=open(r"${WIN_ERR}", "w"),
    creationflags=flags,
)
print(process.pid)
EOF
  PID="$(MSYS_NO_PATHCONV=1 python "$(cygpath -w "$LOG_DIR/start_sidecar.py")")"
  PID="$(printf '%s' "$PID" | tr -d '\r' | awk 'NF{line=$0} END{print line}')"
  echo "Sidecar pid: ${PID:-<empty>}"
  if [[ ! "$PID" =~ ^[0-9]+$ ]]; then
    echo "Failed to start the Windows sidecar. Launcher output: ${PID:-<empty>}"
    exit 1
  fi
else
  setsid "$BIN" >"$LOG_DIR/sidecar.log" 2>&1 &
  PID=$!
fi

sidecar_alive() {
  if [[ "$IS_WINDOWS" == true ]]; then
    tasklist //FI "PID eq ${PID}" | grep -q "${PID}"
  else
    kill -0 "$PID" 2>/dev/null
  fi
}

cleanup() {
  if [[ "$IS_WINDOWS" == true ]]; then
    taskkill //F //T //PID "$PID" >/dev/null 2>&1 || true
  else
    kill -- -"$PID" >/dev/null 2>&1 || kill "$PID" >/dev/null 2>&1 || true
    wait "$PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

print_sidecar_log() {
  if [[ "$IS_WINDOWS" == true ]]; then
    echo "--- stdout ---"
    cat "$LOG_DIR/sidecar.out.log" 2>/dev/null || true
    echo "--- stderr ---"
    cat "$LOG_DIR/sidecar.err.log" 2>/dev/null || true
  else
    cat "$LOG_DIR/sidecar.log" 2>/dev/null || true
  fi
}

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
  if ! sidecar_alive; then
    echo "Sidecar exited before answering /health. Log:"
    print_sidecar_log
    exit 1
  fi
  sleep 2
done

echo "Timed out waiting for sidecar /health. Log:"
print_sidecar_log
exit 1
