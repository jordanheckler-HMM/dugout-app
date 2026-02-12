# Testing

This repo contains two applications with separate test surfaces:

- Backend: FastAPI (Python) in `/Users/jordanheckler/dugout-app/backend`
- Frontend: React + Vite + TypeScript in `/Users/jordanheckler/dugout-app/dugout-lineup-manager-main`

## Repository Facts

- Primary languages:
  - Python (backend)
  - TypeScript (frontend)
- Frameworks/runtime:
  - FastAPI + Pydantic
  - React + Vite
- Package managers:
  - `pip` (`requirements*.txt`) for backend
  - `npm` (`package-lock.json`) for frontend
- Entry points:
  - Backend app: `backend/main.py` (served by `uvicorn main:app`)
  - Frontend app: `dugout-lineup-manager-main/src/main.tsx`
- Existing build system:
  - Frontend: Vite (`npm run build`)
  - Backend: runtime service, no separate compile step

## Assumptions

- The repository root workflow (`.github/workflows/ci.yml`) is the source of truth for CI.
- Backend integration coverage remains backend-owned (API + JSON storage), and frontend tests should stay lightweight.
- External AI dependencies (Ollama/providers) are intentionally mocked/stubbed in tests for deterministic runs.

## Test Scope

### Unit Tests (fast, isolated)

- Backend pure logic:
  - `/Users/jordanheckler/dugout-app/backend/tests/unit/test_stats_utils.py`
- Frontend pure mapping logic:
  - `/Users/jordanheckler/dugout-app/dugout-lineup-manager-main/src/api/mappers.test.ts`

### Integration Tests (boundary-focused)

- Backend API + storage boundary (FastAPI + JSON persistence):
  - `/Users/jordanheckler/dugout-app/backend/tests/integration/test_player_lineup_flow.py`
  - `/Users/jordanheckler/dugout-app/backend/tests/integration/test_game_stats_flow.py`
  - `/Users/jordanheckler/dugout-app/backend/tests/integration/test_game_schedule_flow.py`
  - `/Users/jordanheckler/dugout-app/backend/tests/integration/test_cors.py`
- Frontend API boundary via mocked `fetch`:
  - `/Users/jordanheckler/dugout-app/dugout-lineup-manager-main/src/api/client.test.ts`

### Component Tests (UI state transitions)

- Frontend updater banner transition coverage:
  - `/Users/jordanheckler/dugout-app/dugout-lineup-manager-main/src/components/UpdateBanner.test.tsx`

### Not Tested Yet (by design)

- Full browser E2E/UI drag-and-drop behavior:
  - Deferred to keep baseline fast and deterministic; requires heavier tooling and fixture management.
- Real network calls to Ollama or cloud AI providers:
  - Deferred to avoid flaky CI and credential requirements.
- Tauri packaging/release flows:
  - Deferred from CI baseline because they are release concerns, not core correctness checks.

## Folder Structure

- Backend:
  - `backend/tests/unit/`
  - `backend/tests/integration/`
  - `backend/tests/conftest.py`
- Frontend:
  - `dugout-lineup-manager-main/src/api/*.test.ts`
  - `dugout-lineup-manager-main/src/components/*.test.tsx`

## Run Tests Locally

Backend:

```bash
cd /Users/jordanheckler/dugout-app/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Optional backend marker filtering:

```bash
pytest -m unit
pytest -m integration
```

Frontend:

```bash
cd /Users/jordanheckler/dugout-app/dugout-lineup-manager-main
npm ci
npm run lint
npm run test:run
```

## CI

Workflow:
- `/Users/jordanheckler/dugout-app/.github/workflows/ci.yml`

Triggers:
- Pull requests
- Pushes to `main`

Jobs:
- `Frontend Checks`:
  - `npm ci`
  - `npm run lint`
  - `npm run test:run`
- `Backend Tests`:
  - install Python dependencies from `requirements-dev.txt`
  - `pytest`

## How To Extend

1. Add new backend unit tests under `backend/tests/unit/` for pure calculations and model transforms.
2. Add backend integration tests under `backend/tests/integration/` for endpoint+storage behavior using the `client` fixture.
3. Add frontend tests next to API/services/components in `dugout-lineup-manager-main/src/` and mock `fetch` for deterministic API-boundary checks.
4. Keep tests deterministic:
   - no real external network
   - no shared mutable state across tests
   - stable fixtures only
