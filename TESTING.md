# Testing

This repository now has a minimal, deterministic testing foundation focused on the FastAPI backend.

## What Exists Today

- Unit tests: pure backend logic
  - `/Users/jordanheckler/dugout-app/backend/tests/unit/test_stats_utils.py`
- Integration tests: API + JSON storage boundaries
  - `/Users/jordanheckler/dugout-app/backend/tests/integration/test_player_lineup_flow.py`
  - `/Users/jordanheckler/dugout-app/backend/tests/integration/test_game_stats_flow.py`
- Shared test fixtures:
  - `/Users/jordanheckler/dugout-app/backend/tests/conftest.py`
  - Uses temporary storage and a deterministic Lyra stub.

## Run Tests Locally

From repository root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Optional marker filtering:

```bash
pytest -m unit
pytest -m integration
```

## CI

GitHub Actions workflow:
- `/Users/jordanheckler/dugout-app/.github/workflows/ci.yml`

It runs on:
- Pull requests
- Pushes to `main`

Jobs:
- `Frontend Lint`: `npm ci` + `npm run lint` in `dugout-lineup-manager-main`
- `Backend Tests`: install Python deps + `pytest` in `backend`

## How to Extend

1. Unit tests:
   - Add pure logic tests under `backend/tests/unit/`.
2. Integration tests:
   - Add API/storage tests under `backend/tests/integration/`.
   - Reuse `client` fixture from `conftest.py` for isolated storage.
3. Keep tests deterministic:
   - No real network calls.
   - Use fixtures/stubs for external services (Lyra/Ollama/cloud AI).
