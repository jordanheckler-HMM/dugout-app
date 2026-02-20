# Testing

This repository has two test surfaces:

- Backend: FastAPI in `backend/`
- Frontend: React/Vite in `dugout-lineup-manager-main/`

## CI Source of Truth

CI workflow:

- `.github/workflows/ci.yml`

CI runs:

- Docs: markdown lint + local markdown link validation
- Frontend: `npm ci`, `npm run lint`, `npm run test:run`
- Backend: install `requirements-dev.txt`, then `pytest`

## Backend Tests

Location:

- `backend/tests/unit/`
- `backend/tests/integration/`

Current backend test files:

- `backend/tests/unit/test_stats_utils.py`
- `backend/tests/integration/test_player_lineup_flow.py`
- `backend/tests/integration/test_game_schedule_flow.py`
- `backend/tests/integration/test_game_stats_flow.py`
- `backend/tests/integration/test_cors.py`

Notes:

- `backend/test_backend.py` is a manual smoke script and is not part of the
  pytest suite (`pytest.ini` sets `testpaths = tests`).

Run locally:

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Optional marker filtering:

```bash
pytest -m unit
pytest -m integration
```

## Frontend Tests

Current frontend test files:

- `dugout-lineup-manager-main/src/api/client.test.ts`
- `dugout-lineup-manager-main/src/api/mappers.test.ts`
- `dugout-lineup-manager-main/src/hooks/useGameConfig.test.ts`
- `dugout-lineup-manager-main/src/pages/GameStats.test.tsx`
- `dugout-lineup-manager-main/src/components/UpdateBanner.test.tsx`
- `dugout-lineup-manager-main/src/components/dugout/DugoutLayout.test.tsx`
- `dugout-lineup-manager-main/src/components/dugout/FieldDiagram.test.tsx`
- `dugout-lineup-manager-main/src/components/dugout/LineupCard.test.tsx`
- `dugout-lineup-manager-main/src/components/dugout/LyraPanel.test.tsx`
- `dugout-lineup-manager-main/src/components/dugout/PlayerCard.test.tsx`
- `dugout-lineup-manager-main/src/components/dugout/PlayersSidebar.test.tsx`

Run locally:

```bash
cd dugout-lineup-manager-main
npm ci
npm run lint
npm run test:run
```

## Scope and Intent

- Unit tests cover deterministic logic and transformations.
- Integration tests cover API and storage boundaries.
- Frontend tests focus on API-client behavior and component state/render behavior.

## Known Gaps

- No browser-level E2E tests for full drag-and-drop workflows.
- No live-network tests against real cloud AI providers in CI.
- Tauri release packaging is not part of standard CI checks.
