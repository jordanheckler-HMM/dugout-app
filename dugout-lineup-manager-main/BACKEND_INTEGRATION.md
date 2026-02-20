# Backend Integration

This document describes the current frontend-to-backend contract for Dugout.

## Runtime Topology

```text
Frontend (React/Vite, http://localhost:8123)
  -> API Client (src/api/client.ts)
  -> Backend (FastAPI, http://localhost:8100)
     -> JSON storage (`data/*.json` relative to backend working directory)
     -> AI providers (Ollama/OpenAI/Anthropic)
```

## API Base

The frontend currently uses a fixed backend URL:

- `src/api/client.ts` -> `const API_BASE = "http://localhost:8100"`

If the backend port or host changes, update this constant.

## Endpoint Groups Used by Frontend

### Health

- `GET /health`

### Players

- `GET /players`
- `POST /players`
- `PUT /players/{id}`
- `DELETE /players/{id}`

### Lineup and Field

- `GET /lineup`
- `PUT /lineup`
- `GET /field`
- `PUT /field`

### Configurations

- `GET /configurations`
- `GET /configurations/{id}`
- `POST /configurations`
- `DELETE /configurations/{id}`

### Games and Stats

- `GET /games`
- `GET /games/{id}`
- `POST /games`
- `PUT /games/{id}`
- `DELETE /games/{id}`
- `GET /games/{id}/stats`
- `POST /games/{id}/stats`
- `GET /players/{id}/stats`
- `GET /players/{id}/stats/season`

### AI

- `POST /lyra/analyze` (lineup analysis, Ollama-only)
- `POST /lyra/chat/stream` (streaming chat)
- `GET /settings/ai`
- `PUT /settings/ai`
- `GET /settings/ai/ollama-models`

## Data Mapping Notes

The frontend and backend models differ in some fields/naming. Mapping logic
lives in:

- `src/api/mappers.ts`

Examples:

- `slot_number` (backend) <-> `order` (frontend)
- `home_away` (backend) <-> `homeAway` (frontend)
- snake_case API fields <-> camelCase UI fields

## Persistence

All writes are persisted by backend JSON storage in `data/` relative to the
backend process working directory.

In the default local flow (`cd backend` before starting API), this resolves to
`backend/data/`.

- `players.json`
- `lineup.json`
- `field.json`
- `configurations.json`
- `games.json`
- `game_stats.json`

## Troubleshooting

### Frontend shows backend connection failures

- Confirm backend health: `curl http://localhost:8100/health`
- Confirm frontend origin: `http://localhost:8123`
- Confirm `API_BASE` in `src/api/client.ts`

### Local AI mode is unavailable

- Start Ollama: `ollama serve`
- Confirm model exists: `ollama list` (must include `lyra-coach:latest`)

### CORS issues

Backend CORS currently allows localhost origins including `:8123`, `:5173`,
and `:8080`. If you use a different dev origin, update CORS in
`backend/main.py`.
