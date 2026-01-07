# Backend Integration Summary

This document describes how the frontend has been connected to the local FastAPI backend.

## Overview

The frontend React/Vite application now communicates with the FastAPI backend running at `http://localhost:8000`. All data is persisted to the backend's JSON storage, and Lyra AI coaching insights are provided by the real Ollama integration.

## Architecture

```
Frontend (React/Vite)
  ↓
API Client Layer (src/api/)
  ↓
FastAPI Backend (localhost:8000)
  ↓
JSON Storage (backend/data/)
Ollama (lyra-coach model)
```

## Files Created

### 1. **src/api/client.ts**
   - Complete API client with typed endpoints
   - Handles all HTTP communication with backend
   - Error handling and connection failures
   - Exports: `playersApi`, `lineupApi`, `fieldApi`, `configurationApi`, `lyraApi`, `healthApi`

### 2. **src/api/mappers.ts**
   - Type conversion between frontend and backend data structures
   - Handles differences in naming conventions (camelCase vs snake_case)
   - Preserves frontend-only fields (stats, status, x/y coordinates)

## Files Modified

### 3. **src/hooks/usePlayers.ts**
   **Changes:**
   - Removed mock `initialPlayers` data
   - Added `useEffect` to load players from `GET /players` on mount
   - `addPlayer()` now calls `POST /players`
   - `updatePlayer()` now calls `PUT /players/{id}`
   - `removePlayer()` now calls `DELETE /players/{id}`
   - Added `loading` and `error` states
   - All operations now async

### 4. **src/hooks/useGameConfig.ts**
   **Changes:**
   - Added `useEffect` to load lineup and field from backend on mount
   - `assignToLineup()` syncs to `PUT /lineup` after state update
   - `removeFromLineup()` syncs to `PUT /lineup`
   - `reorderLineup()` syncs to `PUT /lineup`
   - `assignToField()` syncs to `PUT /field`
   - `removeFromField()` syncs to `PUT /field`
   - `saveConfiguration()` calls `POST /configurations`
   - `loadConfiguration()` calls `GET /configurations/{id}`
   - `clearLineup()` and `clearField()` sync to backend
   - All operations now async

### 5. **src/components/dugout/LyraPanel.tsx**
   **Changes:**
   - Now receives `lineup`, `fieldPositions`, `players` as props
   - Removed mock `generateLyraResponse()` function
   - `handleSend()` now calls `POST /lyra/analyze` with real context
   - Converts frontend data to backend format before sending
   - Displays real AI responses from Ollama
   - Added error handling with visual feedback

### 6. **src/components/dugout/DugoutLayout.tsx**
   **Changes:**
   - Passes `lineup`, `fieldPositions`, `players` props to `<LyraPanel />`

## API Configuration

The backend URL is configured in `src/api/client.ts`:

```typescript
const API_BASE = "http://localhost:8000";
```

To change the backend URL, update this constant.

## Data Flow Examples

### Loading Players
1. Component mounts → `usePlayers()` hook runs `useEffect`
2. Calls `playersApi.getAll()` → `GET /players`
3. Maps backend players to frontend format
4. Updates React state
5. UI re-renders with player data

### Adding a Player
1. User clicks "Add Player" in UI
2. Calls `addPlayer(playerData)`
3. Maps frontend data to backend format
4. Sends `POST /players` with player data
5. Backend saves to `data/players.json`
6. Returns created player with ID
7. Maps back to frontend format
8. Adds to React state
9. UI updates immediately

### Updating Lineup
1. User drags player to lineup slot
2. Calls `assignToLineup(playerId, order, position)`
3. Updates local React state (optimistic update)
4. Maps lineup to backend format
5. Sends `PUT /lineup` with all 9 slots
6. Backend saves to `data/lineup.json`
7. If error occurs, logs to console (could add retry logic)

### Getting Lyra Coaching Insight
1. User types question in Lyra panel
2. Calls `handleSend()` with question text
3. Gathers current lineup, field, and players
4. Maps all data to backend format
5. Sends `POST /lyra/analyze` with full context
6. Backend formats prompt and sends to Ollama
7. Lyra model generates coaching perspective
8. Backend returns advisory text (no actions)
9. Displays in chat as message from Lyra

## Error Handling

All API calls include error handling:

- **Network errors**: Caught and logged to console
- **HTTP errors**: Displayed with status code and message
- **Backend unavailable**: Clear error message to user
- **Ollama unavailable**: Lyra shows connection warning

The app continues working with local state even if backend calls fail (fire-and-forget approach for updates).

## Type Safety

Frontend and backend types are matched through mappers:

| Frontend Type | Backend Type | Notes |
|---------------|--------------|-------|
| `Player` | `BackendPlayer` | Frontend has `status` and `stats`, backend has `notes` |
| `LineupSlot` | `BackendLineupSlot` | Frontend uses `order`, backend uses `slot_number` |
| `FieldPosition` | `BackendFieldPosition` | Frontend has `x`/`y` coordinates for visualization |

## Local-First Principles Maintained

✅ **No cloud services** - All communication is localhost only  
✅ **No authentication** - Simple local API with no auth required  
✅ **Coach is decision-maker** - Lyra returns advisory text only, never modifies data  
✅ **No hidden state changes** - All backend updates are explicit in code  
✅ **Human-readable storage** - Backend uses JSON files in `backend/data/`  

## Testing the Integration

### 1. Start Backend
```bash
cd backend
./start.sh  # or start.bat on Windows
```

### 2. Start Frontend
```bash
cd dugout-lineup-manager-main
npm run dev
```

### 3. Verify Connection
- Open browser to frontend (usually http://localhost:5173)
- Check browser console for any errors
- Players should load from backend
- Changes should persist after refresh
- Lyra should respond with real AI insights

### 4. Check Backend Logs
Backend will log:
- API requests
- Ollama connection status
- Any errors

### 5. Inspect Data Files
Look in `backend/data/` to see persisted data:
```bash
ls -la backend/data/
cat backend/data/players.json
cat backend/data/lineup.json
```

## Troubleshooting

### "Failed to load players"
- Check if backend is running on port 8000
- Check browser console for CORS errors
- Verify `backend/data/` directory exists

### "Cannot connect to backend"
- Backend not started
- Wrong port (should be 8000)
- Firewall blocking localhost connections

### "Lyra connection error"
- Ollama not running (`ollama serve`)
- lyra-coach model not created
- Check backend logs for Ollama errors

### Players/lineup don't persist after refresh
- Backend database write errors
- Check `backend/data/` permissions
- Check backend logs for save errors

## Future Enhancements

Possible improvements to the integration:

1. **Optimistic Updates with Rollback**: If backend save fails, revert local state
2. **Retry Logic**: Auto-retry failed requests with exponential backoff
3. **Offline Mode**: Queue updates when backend is unavailable
4. **Real-time Sync**: WebSocket connection for multi-device sync
5. **Loading States**: Show spinners during data fetches
6. **Toast Notifications**: User feedback for save success/failure
7. **Batch Updates**: Combine multiple lineup changes into one request

## Summary

The frontend is now fully integrated with the backend:
- ✅ Players loaded from and saved to backend
- ✅ Lineup changes persisted automatically
- ✅ Field positions synced to backend
- ✅ Configurations stored in backend
- ✅ Lyra uses real AI model for coaching insights
- ✅ All data persists across browser refreshes
- ✅ Local-first principles maintained throughout

