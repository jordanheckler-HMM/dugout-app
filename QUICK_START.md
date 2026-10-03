# Quick Start

This guide runs the full Dugout stack locally.

## Prerequisites

- Python 3.11 (required)
- Node.js 20+
- npm

## 1. Start Backend

```bash
cd backend
./start.sh
```

If `python3` on your machine is not 3.11, use manual startup instead:

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8100
```

Backend endpoints:

- API base: `http://localhost:8100`
- OpenAPI docs: `http://localhost:8100/docs`

## 2. Start Frontend

In a second terminal:

```bash
cd dugout-lineup-manager-main
npm install
npm run dev
```

Frontend URL:

- `http://localhost:8123`

## 3. Verify Basic App Flow

1. Open `http://localhost:8123`
2. Add or edit players in the roster
3. Assign lineup slots and field positions
4. Save a configuration
5. Create a game and enter game stats

## Architecture

```text
Frontend (React/Vite, :8123)
  -> API Client (src/api/client.ts)
  -> Backend (FastAPI, :8100)
     -> JSON Storage (`data/*.json` relative to backend working directory)
```

## Common Issues

### Frontend cannot reach backend

- Confirm backend is running: `curl http://localhost:8100/health`
- Confirm frontend is on `http://localhost:8123`
- Confirm `API_BASE` in `dugout-lineup-manager-main/src/api/client.ts` is `http://localhost:8100`

### Port conflict on backend

Run backend on another port:

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8101
```

Then update frontend `API_BASE` accordingly.
