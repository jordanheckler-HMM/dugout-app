# Dugout Backend (FastAPI)

FastAPI backend for the Dugout baseball coaching application.

The backend is local-first by default and persists application state to JSON files.

## Features

- Player CRUD
- Lineup and field-position management
- Saved lineup configurations
- Game schedule CRUD
- Per-game stat entry and season stat aggregation
- AI endpoints for lineup analysis and streaming chat
- AI settings endpoints for provider/model configuration

## Prerequisites

- Python 3.11 (required; current dependency pins are validated on 3.11)
- `pip`

Optional (for local AI mode):

- Ollama running at `http://localhost:11434`
- `lyra-coach` model created from `Modelfile`

## Installation

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the API

### Option 1: Startup script (recommended)

```bash
cd backend
./start.sh
```

Windows:

```bat
cd backend
start.bat
```

### Option 2: Manual `uvicorn`

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8100
```

Default local URL:

- API: `http://localhost:8100`
- Docs: `http://localhost:8100/docs`
- ReDoc: `http://localhost:8100/redoc`

## Local AI Setup (Ollama)

```bash
ollama serve
cd backend
ollama create lyra-coach -f Modelfile
ollama list
```

The backend checks for `lyra-coach:latest`.

## Environment Variables

- `DUGOUT_DATA_DIR`: Override data directory (default: `data`)
- `DUGOUT_BACKEND_PORT`: Startup display/runtime port fallback (default: `8100`)

## API Endpoints

### Health

- `GET /`
- `GET /health`

### Players

- `GET /players`
- `POST /players`
- `GET /players/{player_id}`
- `PUT /players/{player_id}`
- `DELETE /players/{player_id}`

### Lineup and Field

- `GET /lineup`
- `PUT /lineup`
- `GET /field`
- `PUT /field`

### Configurations

- `GET /configurations`
- `POST /configurations`
- `GET /configurations/{config_id}`
- `DELETE /configurations/{config_id}`

### Games

- `GET /games`
- `POST /games`
- `GET /games/{game_id}`
- `PUT /games/{game_id}`
- `DELETE /games/{game_id}`

### Game Stats

- `GET /games/{game_id}/stats`
- `POST /games/{game_id}/stats`
- `GET /players/{player_id}/stats`
- `GET /players/{player_id}/stats/season`

### AI

- `POST /lyra/analyze` (rate-limited: 10/minute)
- `POST /lyra/chat/stream` (rate-limited: 20/minute)

### AI Settings

- `GET /settings/ai`
- `PUT /settings/ai`
- `GET /settings/ai/ollama-models`

## Data Storage

Default storage directory: `backend/data/`

Files:

- `players.json`
- `lineup.json`
- `field.json`
- `configurations.json`
- `games.json`
- `game_stats.json`

Storage characteristics:

- Human-readable JSON
- Local file persistence
- Atomic write pattern for safer updates

## CORS

Current allowed origins include:

- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:8123`
- `http://127.0.0.1:8123`
- `tauri://localhost`
- `http://tauri.localhost`
- `https://tauri.localhost`

If your frontend origin differs, update `allow_origins` in `main.py`.

## Running Tests

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

## Troubleshooting

### Backend not reachable

- Check server is running: `curl http://localhost:8100/health`
- Confirm no local firewall/process conflict on port `8100`

### Port already in use

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8101
```

Update frontend `API_BASE` if you change the backend port.

### Ollama connection failures

- Start Ollama: `ollama serve`
- Verify API: `curl http://localhost:11434/api/tags`

### `lyra-coach` model missing

```bash
cd backend
ollama create lyra-coach -f Modelfile
```

### CORS errors

Use an allowed localhost origin or update CORS config in `main.py`.

## Security Notes

This backend is designed for local or trusted-network usage.

- No authentication layer by default
- No HTTPS termination by default
- Not intended to be exposed publicly without additional security controls
