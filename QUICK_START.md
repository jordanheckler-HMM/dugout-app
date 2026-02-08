# Quick Start Guide

## Running the Full Application

### Step 1: Start Ollama (if not already running)
```bash
ollama serve
```

### Step 2: Verify Lyra Model Exists
```bash
ollama list
# Should show "lyra-coach:latest"
```

If not present, create it:
```bash
cd backend
ollama create lyra-coach -f Modelfile
```

### Step 3: Start Backend
```bash
cd backend
./start.sh  # macOS/Linux
# OR
start.bat   # Windows
```

Backend will start on http://localhost:8100

### Step 4: Start Frontend
```bash
cd dugout-lineup-manager-main
npm install  # First time only
npm run dev
```

Frontend will start on http://localhost:8123

### Step 5: Open in Browser
Navigate to: http://localhost:8123

## What to Expect

1. **Players Tab**: Players load from backend automatically
2. **Lineup**: Drag players to lineup slots - changes save automatically
3. **Field Diagram**: Assign defensive positions - syncs to backend
4. **Lyra Panel**: Ask questions and get real AI coaching perspective
5. **Save Configurations**: Store lineup/field setups by name

## Verifying It Works

### Check Players Persist
1. Add a new player
2. Refresh the browser
3. Player should still be there

### Check Lineup Persists
1. Drag players to lineup
2. Refresh the browser
3. Lineup should be unchanged

### Check Lyra Works
1. Type a question in Lyra panel
2. Should get thoughtful coaching perspective
3. If error, check backend logs for Ollama connection

## Troubleshooting

### Backend Won't Start
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Shows Connection Error
- Check backend is running: `curl http://localhost:8100/health`
- Check CORS is configured for your frontend port
- Check browser console for specific error

### Lyra Doesn't Respond
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check lyra-coach model exists
ollama list

# Test backend health endpoint
curl http://localhost:8100/health
```

### Data Not Persisting
- Check `backend/data/` directory exists
- Check file permissions on data directory
- Check backend logs for write errors

## File Locations

- **Backend**: `/backend/`
- **Frontend**: `/dugout-lineup-manager-main/`
- **Data Storage**: `/backend/data/` (JSON files)
- **API Docs**: http://localhost:8100/docs (when backend running)

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React/Vite)                      │
│  http://localhost:5173                      │
│                                             │
│  - src/api/client.ts (API calls)            │
│  - src/hooks/usePlayers.ts (data)           │
│  - src/hooks/useGameConfig.ts (lineup)      │
│  - src/components/dugout/LyraPanel.tsx (AI) │
└─────────────────┬───────────────────────────┘
                  │ HTTP REST
                  ▼
┌─────────────────────────────────────────────┐
│  Backend (FastAPI)                          │
│  http://localhost:8100                      │
│                                             │
│  - main.py (REST endpoints)                 │
│  - storage.py (JSON persistence)            │
│  - ollama_client.py (AI integration)        │
└─────────────┬──────────┬────────────────────┘
              │          │
              ▼          ▼
    ┌──────────────┐  ┌──────────────┐
    │ JSON Storage │  │    Ollama    │
    │ backend/data/│  │ localhost:   │
    │              │  │   11434      │
    │ players.json │  │              │
    │ lineup.json  │  │ lyra-coach   │
    │ field.json   │  │   model      │
    │ configs.json │  │              │
    └──────────────┘  └──────────────┘
```

## Next Steps

1. **Add Players**: Use the sidebar to add your team roster
2. **Build Lineup**: Drag players into batting order
3. **Set Positions**: Assign defensive positions on field diagram
4. **Ask Lyra**: Get AI perspective on your lineup choices
5. **Save Config**: Save different lineup arrangements by name

## API Reference

See full API docs at: http://localhost:8100/docs

Key endpoints:
- `GET /players` - List all players
- `POST /players` - Add new player
- `PUT /lineup` - Update batting order
- `PUT /field` - Update field positions
- `POST /lyra/analyze` - Get AI coaching perspective
- `POST /configurations` - Save lineup configuration

## Local-First Guarantees

✅ No cloud services or external APIs  
✅ No authentication required  
✅ All data stored locally in JSON  
✅ AI runs on your machine via Ollama  
✅ Works completely offline (except Ollama model download)  
✅ Your data never leaves your computer  

Enjoy coaching! 🧢⚾
