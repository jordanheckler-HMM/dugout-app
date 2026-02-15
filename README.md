# Dugout App

Dugout is a local-first baseball coaching application with a React frontend
and a FastAPI backend. It helps coaches manage players, lineups, field
positions, game schedules, and game stats, with optional AI assistance.

## Repository Layout

- `dugout-lineup-manager-main/`: Frontend app (React, Vite, TypeScript, Tauri)
- `backend/`: Backend API (FastAPI, JSON file storage)
- `data/`: Seed/default data used by local workflows
- `QUICK_START.md`: End-to-end startup guide
- `TESTING.md`: Test strategy and commands

## Core Capabilities

- Player roster management
- Drag-and-drop lineup and defensive position management
- Save/load lineup configurations
- Game scheduling and per-game stat entry
- Season stat aggregation
- AI assistant support:
  - Local mode via Ollama (`lyra-coach:latest`)
  - Cloud mode via OpenAI or Anthropic

## Prerequisites

- Node.js 20+
- npm
- Python 3.11 (required; CI uses 3.11)
- Optional for local AI mode: Ollama running on `http://localhost:11434`

## Quick Start

1. Start the backend:

```bash
cd backend
./start.sh
```

If your system `python3` is not 3.11, run backend setup manually with
`python3.11` (see `/backend/README.md`).

1. Start the frontend in a second terminal:

```bash
cd dugout-lineup-manager-main
npm install
npm run dev
```

1. Open the app:

- Frontend: `http://localhost:8123`
- Backend API docs: `http://localhost:8100/docs`

1. Optional local AI setup (if using Ollama mode):

```bash
cd backend
ollama serve
ollama create lyra-coach -f Modelfile
```

The model is referenced by the app as `lyra-coach:latest`.

## Testing

Backend:

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Frontend:

```bash
cd dugout-lineup-manager-main
npm ci
npm run lint
npm run test:run
```

## Desktop Build and Release

Local desktop build flow:

```bash
cd dugout-lineup-manager-main
npm ci
npm run build:sidecar
npm run build
```

Signed Tauri build helper:

```bash
cd dugout-lineup-manager-main
./build_dugout.sh "<TAURI_SIGNING_PRIVATE_KEY>"
```

Automated release workflow:

- `.github/workflows/release-tauri.yml`
- Triggered by `v*` git tags or manual workflow dispatch

## Additional Documentation

- `QUICK_START.md`
- `TESTING.md`
- `backend/README.md`
- `dugout-lineup-manager-main/README.md`
- `dugout-lineup-manager-main/BACKEND_INTEGRATION.md`
