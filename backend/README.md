# Dugout Baseball Coaching Backend

Local-first FastAPI backend for baseball coaching and lineup management with AI-powered coaching perspective via Lyra.

## Core Principles

- **Local-first only**: No cloud services, no auth, no telemetry
- **Coach is the decision-maker**: AI provides perspective, not prescriptions
- **Transparency**: Everything is explainable and reversible
- **Simplicity**: Human-readable JSON storage, easy to modify and backup

## Prerequisites

Before running the backend, ensure you have:

1. **Python 3.11 or higher**
   ```bash
   python --version  # Should be 3.11+
   ```

2. **Ollama installed and running**
   ```bash
   # Install Ollama from: https://ollama.ai
   
   # Start Ollama server
   ollama serve
   ```

3. **Lyra-coach model created**
   ```bash
   # Make sure you have a Modelfile in your project
   # Then create the model:
   ollama create lyra-coach -f Modelfile
   
   # Verify it's available:
   ollama list
   ```

## Installation

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   
   # Activate it:
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Backend

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The server will start on `http://localhost:8100`

You should see output like:
```
🧢 Dugout Baseball Coaching API
============================================================
API running at: http://localhost:8100
API docs at: http://localhost:8100/docs
Data directory: /path/to/backend/data
✓ Ollama connected
  Available models: lyra-coach
  ✓ lyra-coach model ready
============================================================
```

## API Documentation

Once the server is running, visit:
- **Interactive API docs**: http://localhost:8100/docs
- **Alternative docs**: http://localhost:8100/redoc

## API Endpoints

### Health Check
- `GET /` - Root health check
- `GET /health` - Detailed health status (including Ollama connection)

### Player Management
- `GET /players` - List all players
- `POST /players` - Create a new player
- `GET /players/{id}` - Get a specific player
- `PUT /players/{id}` - Update a player
- `DELETE /players/{id}` - Delete a player

### Lineup Management
- `GET /lineup` - Get current batting order (9 slots)
- `PUT /lineup` - Update the entire lineup

### Field Positions
- `GET /field` - Get current defensive positions
- `PUT /field` - Update field positions

### Configurations
- `GET /configurations` - List all saved configurations
- `POST /configurations` - Save current lineup/field as a named configuration
- `GET /configurations/{id}` - Load a specific configuration
- `DELETE /configurations/{id}` - Delete a configuration

### Lyra (AI Coaching Perspective)
- `POST /lyra/analyze` - Get coaching perspective from Lyra
  - Accepts current lineup, field positions, players, and optional question
  - Returns advisory text (Lyra never makes decisions or gives commands)

## Data Storage

All data is stored in the `backend/data/` directory as JSON files:

- **players.json** - All players on the team
- **lineup.json** - Current batting order (9 slots)
- **field.json** - Current defensive positions
- **configurations.json** - Saved lineup/field configurations

These files are:
- Human-readable
- Easy to backup (just copy the `data/` folder)
- Easy to edit manually if needed
- Created automatically on first run

## Example Usage

### Create a Player
```bash
curl -X POST http://localhost:8100/players \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "number": 7,
    "primary_position": "SS",
    "secondary_positions": ["2B", "3B"],
    "bats": "R",
    "throws": "R",
    "notes": "Fast runner, good arm"
  }'
```

### Update Lineup
```bash
curl -X PUT http://localhost:8100/lineup \
  -H "Content-Type: application/json" \
  -d '{
    "lineup": [
      {"slot_number": 1, "player_id": "player-id-1"},
      {"slot_number": 2, "player_id": "player-id-2"},
      {"slot_number": 3, "player_id": null},
      {"slot_number": 4, "player_id": null},
      {"slot_number": 5, "player_id": null},
      {"slot_number": 6, "player_id": null},
      {"slot_number": 7, "player_id": null},
      {"slot_number": 8, "player_id": null},
      {"slot_number": 9, "player_id": null}
    ]
  }'
```

### Get Lyra's Perspective
```bash
curl -X POST http://localhost:8100/lyra/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "lineup": [...],
    "field_positions": [...],
    "players": [...],
    "question": "What should I consider with this defensive alignment?"
  }'
```

## Troubleshooting

### "Cannot connect to Ollama"

**Problem**: The backend can't reach Ollama.

**Solution**: Make sure Ollama is running:
```bash
ollama serve
```

Check if it's responding:
```bash
curl http://localhost:11434/api/tags
```

### "Lyra-coach model not found"

**Problem**: The Lyra model hasn't been created in Ollama.

**Solution**: Create the model:
```bash
ollama create lyra-coach -f Modelfile
```

Verify it exists:
```bash
ollama list
```

### CORS Errors from Frontend

**Problem**: Browser blocks requests from frontend.

**Solution**: The backend is configured to allow:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (alternative port)

If your frontend runs on a different port, update the `allow_origins` list in `main.py`.

### Port Already in Use

**Problem**: Port 8000 is already taken.

**Solution**: Run on a different port:
```bash
uvicorn main:app --reload --port 8001
```

### JSON Files Corrupted

**Problem**: Data files have invalid JSON.

**Solution**: 
1. Stop the server
2. Backup the `data/` directory
3. Delete the corrupted file(s)
4. Restart the server (files will be recreated with defaults)

## Development

### Running Tests
```bash
# Install pytest if not already installed
pip install pytest httpx

# Run tests (when test files are added)
pytest
```

### Code Style
The codebase follows:
- PEP 8 style guidelines
- Type hints for better code clarity
- Extensive comments explaining intent

### Adding New Endpoints
1. Define any new Pydantic models in `models.py`
2. Add storage methods in `storage.py` if needed
3. Create endpoint in `main.py`
4. Update this README with new endpoint docs

## Architecture

```
backend/
├── main.py              # FastAPI app and all endpoints
├── models.py            # Pydantic data models
├── storage.py           # JSON file persistence layer
├── ollama_client.py     # Ollama/Lyra integration
├── requirements.txt     # Python dependencies
├── README.md           # This file
└── data/               # JSON storage (auto-created)
    ├── players.json
    ├── lineup.json
    ├── field.json
    └── configurations.json
```

## Security Notes

This backend is designed for **local use only**:
- No authentication (not needed for single-coach, local use)
- No HTTPS (local connections only)
- No rate limiting
- No input sanitization beyond Pydantic validation

**Do NOT expose this API to the internet without adding proper security measures.**

## Backup and Data Management

### Backing Up Data
Simply copy the `data/` directory:
```bash
cp -r backend/data backend/data_backup_$(date +%Y%m%d)
```

### Restoring Data
Replace the `data/` directory with your backup:
```bash
cp -r backend/data_backup_20240101 backend/data
```

### Exporting Data
All files are JSON - you can:
- Read them with any text editor
- Parse them with spreadsheet software
- Process them with scripts
- Version control them with git

## Future Enhancements

The architecture supports easy additions:
- Export configurations to CSV
- Import player rosters from spreadsheets
- Add game notes without changing core structure
- Swap Ollama for different local AI models
- Add more Lyra prompts for different coaching scenarios

## License

This is a pilot-stage tool intended for real coaches.
Local-first, privacy-respecting, coach-empowering.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify Ollama is running and lyra-coach model exists
3. Check the API docs at http://localhost:8100/docs
4. Review the logs in the terminal where the server is running
