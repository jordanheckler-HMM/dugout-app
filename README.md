# Dugout App

Dugout is a local-first baseball coaching application with a React frontend
and a FastAPI backend. It helps coaches manage players, lineups, field
positions, game schedules, and game stats.

The desktop app stores data on the coach's computer. It currently has no
program accounts, cloud sync, or shared team workspace. Those are separate
requirements before selling a multi-coach service to a program.

## Repository Layout

- `dugout-lineup-manager-main/`: Frontend app (React, Vite, TypeScript, Tauri)
- `backend/`: Backend API (FastAPI, JSON file storage)
- `backend/data/`: Default JSON storage path when backend is started from `backend/`
- `data/`: Repository-level sample/seed snapshot (not used by default backend startup)
- `QUICK_START.md`: End-to-end startup guide
- `TESTING.md`: Test strategy and commands

## Core Capabilities

- Player roster management
- Drag-and-drop lineup and defensive position management
- Save/load lineup configurations
- Game scheduling and per-game stat entry
- Season stat aggregation
- The Lyra panel is not part of the Dugout app interface. Legacy AI endpoints
  remain in the backend for compatibility; the desktop workflow does not use them.

## Prerequisites

- Node.js 20+
- npm
- Python 3.11 (required; CI uses 3.11)

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

Local desktop build flow (run on each target operating system):

```bash
cd dugout-lineup-manager-main
npm ci
# requires Python 3.11, backend requirements, PyInstaller, and Rust
npm run build:sidecar
npm run tauri build
```

Updater-signed Tauri build helper:

```bash
cd dugout-lineup-manager-main
# first build the backend sidecar, then supply signing values through the
# environment or a credential manager (never as a shell argument)
./build_dugout.sh
```

Automated release workflow:

- `.github/workflows/release-tauri.yml`
- Builds macOS Apple Silicon, macOS Intel, Windows, and Linux bundles from a
  `v*` tag
- Creates or updates the matching GitHub release; hyphenated tags and the
  manual prerelease option remain prereleases
- A Windows installer and signed updater artifacts are not verified until that
  workflow completes successfully on GitHub Actions
- The workflow requires the Tauri updater signing secret. Apple Developer
  ID/notarization and Windows Authenticode signing are not configured yet, so
  downloaded builds may show trust prompts.

Pull requests also run `.github/workflows/desktop-preview.yml`, which builds
unsigned Apple Silicon, Intel Mac, and Windows previews as Actions artifacts.
These previews need an installed-app check on each operating system before
distribution.

## Data and Integration Boundaries

- Installed desktop data is stored in Dugout's operating-system app data
  directory as local JSON files. An install on a second computer does not
  automatically see the first computer's roster or games.
- There is no in-app backup or restore flow yet. Keep a copy of the app data
  directory before moving devices or reinstalling.
- The local backend listens on `127.0.0.1:8100`. It has no user authentication,
  so treat the computer account and local data directory as the trust boundary.
- HYMetaLab Supabase is **not connected** to Dugout. A future multi-program
  service needs Dugout-specific program and membership records, access rules,
  and an account flow before team data is uploaded.
- Bench Coach MCP is **not connected**. A future optional practice-brief action
  can preview aggregate inputs such as age tier, player count, and duration
  before sending them. Player names, numbers, notes, and individual stats should
  remain local unless a coach explicitly chooses a future sharing feature.

## Additional Documentation

- `QUICK_START.md`
- `TESTING.md`
- `backend/README.md`
- `dugout-lineup-manager-main/README.md`
- `dugout-lineup-manager-main/BACKEND_INTEGRATION.md`
- `docs/DISTRIBUTION_AND_PROGRAMS.md`
