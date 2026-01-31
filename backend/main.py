"""
FastAPI backend for the baseball coaching application.

This is the main entry point for the REST API.
Run with: uvicorn main:app --reload

Core principles:
- Local-first: No cloud services, no auth, no telemetry
- Coach is the decision-maker: AI provides perspective only
- Transparency: Everything is readable and reversible
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uuid
from datetime import datetime

from models import (
    Player,
    PlayerCreate,
    PlayerUpdate,
    LineupSlot,
    LineupUpdate,
    FieldPosition,
    FieldUpdate,
    Configuration,
    ConfigurationCreate,
    LyraRequest,
    LyraResponse,
    Game,
    GameCreate,
    GameUpdate,
    GameStats,
    GameStatsCreate,
    BulkGameStatsCreate,
    ChatRequest,
)
from storage import JSONStorage
from ollama_client import LyraClient
from ai_service import AIService, AIConfig
from fastapi.responses import StreamingResponse


# Initialize FastAPI app
app = FastAPI(
    title="Dugout Baseball Coaching API",
    description="Local-first API for baseball coaching and lineup management",
    version="1.0.0",
)

# Configure CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage and Ollama client
storage = JSONStorage(data_dir="data")
lyra = LyraClient(model_name="lyra-coach:latest")

# Initialize Unified AI Service
ai_config = AIConfig()
ai_service = AIService(ai_config)


# --- Health check ---

@app.get("/", tags=["Health"])
def root():
    """Root endpoint - health check."""
    return {
        "status": "ok",
        "message": "Dugout Baseball Coaching API",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint.
    
    Checks if the API is running and if Ollama is accessible.
    """
    ollama_status = lyra.check_connection()
    ollama_models = lyra.list_models() if ollama_status else []
    
    return {
        "api": "ok",
        "ollama_connected": ollama_status,
        "ollama_models": ollama_models,
        "lyra_model_available": "lyra-coach:latest" in ollama_models,
    }


# --- Player endpoints ---

@app.get("/players", response_model=List[Player], tags=["Players"])
def get_players():
    """Get all players on the team."""
    return storage.get_players()


@app.post("/players", response_model=Player, status_code=status.HTTP_201_CREATED, tags=["Players"])
def create_player(player_data: PlayerCreate):
    """
    Create a new player.
    
    Generates a unique ID for the player.
    """
    # Generate unique ID
    player_id = str(uuid.uuid4())
    
    # Create player object
    player = Player(
        id=player_id,
        **player_data.model_dump()
    )
    
    # Save to storage
    storage.add_player(player)
    
    return player


@app.get("/players/{player_id}", response_model=Player, tags=["Players"])
def get_player(player_id: str):
    """Get a specific player by ID."""
    player = storage.get_player_by_id(player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {player_id} not found"
        )
    return player


@app.put("/players/{player_id}", response_model=Player, tags=["Players"])
def update_player(player_id: str, player_data: PlayerUpdate):
    """
    Update a player's information.
    
    Only provided fields will be updated.
    """
    # Get only non-None fields from update
    update_dict = {k: v for k, v in player_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update"
        )
    
    updated_player = storage.update_player(player_id, update_dict)
    
    if not updated_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {player_id} not found"
        )
    
    return updated_player


@app.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Players"])
def delete_player(player_id: str):
    """
    Delete a player and cascade remove all references.
    
    This will automatically remove the player from:
    - Current lineup
    - Current field positions
    - All saved configurations
    """
    players = storage.get_players()
    original_count = len(players)
    
    # Filter out the player
    players = [p for p in players if p.id != player_id]
    
    if len(players) == original_count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {player_id} not found"
        )
    
    # Cascade delete references
    cleanup_summary = storage.cascade_delete_player_references(player_id)
    
    # Delete the player
    storage.save_players(players)
    
    # Log cleanup for debugging (optional but helpful)
    print(f"Deleted player {player_id}. Cleanup: {cleanup_summary}")
    
    return None


# --- Lineup endpoints ---

@app.get("/lineup", response_model=List[LineupSlot], tags=["Lineup"])
def get_lineup():
    """Get the current batting order (9 slots)."""
    return storage.get_lineup()


@app.put("/lineup", response_model=List[LineupSlot], tags=["Lineup"])
def update_lineup(lineup_data: LineupUpdate):
    """
    Update the entire batting order.
    
    Must provide all 9 slots.
    """
    lineup = lineup_data.lineup
    
    # Validate we have 9 slots
    if len(lineup) != 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lineup must have exactly 9 slots"
        )
    
    # Validate slot numbers are 1-9
    slot_numbers = sorted([slot.slot_number for slot in lineup])
    if slot_numbers != list(range(1, 10)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lineup must have slots numbered 1-9 (no duplicates)"
        )
    
    storage.save_lineup(lineup)
    return lineup


# --- Field position endpoints ---

@app.get("/field", response_model=List[FieldPosition], tags=["Field"])
def get_field():
    """Get current defensive positions."""
    return storage.get_field()


@app.put("/field", response_model=List[FieldPosition], tags=["Field"])
def update_field(field_data: FieldUpdate):
    """
    Update defensive positions.
    
    Expected positions: P, C, 1B, 2B, 3B, SS, LF, CF, RF (and optionally DH)
    """
    field_positions = field_data.field_positions
    
    # Validate we have the right positions
    base_positions = {"P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"}
    provided_positions = {pos.position for pos in field_positions}
    
    # Check if DH is included
    has_dh = "DH" in provided_positions
    expected_positions = base_positions | {"DH"} if has_dh else base_positions
    
    if provided_positions != expected_positions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Must provide exactly these positions: {expected_positions}. Got: {provided_positions}"
        )
    
    storage.save_field(field_positions)
    return field_positions


# --- Configuration endpoints ---

@app.get("/configurations", response_model=List[Configuration], tags=["Configurations"])
def get_configurations():
    """Get all saved lineup/field configurations."""
    return storage.get_configurations()


@app.post("/configurations", response_model=Configuration, status_code=status.HTTP_201_CREATED, tags=["Configurations"])
def create_configuration(config_data: ConfigurationCreate):
    """
    Save current lineup and field positions as a named configuration.
    
    Examples: "Starting Lineup", "Late Inning Defense", "Practice Rotation"
    """
    # Generate unique ID
    config_id = str(uuid.uuid4())
    
    # Create configuration
    config = Configuration(
        id=config_id,
        name=config_data.name,
        lineup=config_data.lineup,
        field_positions=config_data.field_positions,
        notes=config_data.notes,
        last_used_timestamp=datetime.now().isoformat(),
    )
    
    storage.save_configuration(config)
    return config


@app.get("/configurations/{config_id}", response_model=Configuration, tags=["Configurations"])
def get_configuration(config_id: str):
    """
    Get a specific configuration by ID.
    
    Use this to load a saved lineup arrangement.
    """
    config = storage.get_configuration_by_id(config_id)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration with ID {config_id} not found"
        )
    
    # Update last_used_timestamp
    config.last_used_timestamp = datetime.now().isoformat()
    storage.save_configuration(config)
    
    return config


@app.delete("/configurations/{config_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Configurations"])
def delete_configuration(config_id: str):
    """Delete a saved configuration."""
    configs = storage.get_configurations()
    original_count = len(configs)
    
    # Filter out the configuration
    configs = [c for c in configs if c.id != config_id]
    
    if len(configs) == original_count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration with ID {config_id} not found"
        )
    
    storage._save_configurations(configs)
    return None


# --- Game endpoints ---

@app.get("/games", response_model=List[Game], tags=["Games"])
def get_games():
    """Get all games."""
    games = storage.get_games()
    # Sort by date, most recent first
    games.sort(key=lambda g: g.date, reverse=True)
    return games


@app.post("/games", response_model=Game, status_code=status.HTTP_201_CREATED, tags=["Games"])
def create_game(game_data: GameCreate):
    """
    Create a new game.
    
    Used to track games for stats entry.
    """
    game_id = str(uuid.uuid4())
    
    game = Game(
        id=game_id,
        created_at=datetime.now().isoformat(),
        **game_data.model_dump()
    )
    
    storage.add_game(game)
    return game


@app.get("/games/{game_id}", response_model=Game, tags=["Games"])
def get_game(game_id: str):
    """Get a specific game by ID."""
    game = storage.get_game_by_id(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} not found"
        )
    return game


@app.put("/games/{game_id}", response_model=Game, tags=["Games"])
def update_game(game_id: str, game_data: GameUpdate):
    """Update a game's information."""
    update_dict = {k: v for k, v in game_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update"
        )
    
    updated_game = storage.update_game(game_id, update_dict)
    
    if not updated_game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} not found"
        )
    
    return updated_game


@app.delete("/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Games"])
def delete_game(game_id: str):
    """
    Delete a game and all its associated stats.
    """
    success = storage.delete_game(game_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} not found"
        )
    
    return None


# --- Game Stats endpoints ---

@app.get("/games/{game_id}/stats", response_model=List[GameStats], tags=["Game Stats"])
def get_game_stats(game_id: str):
    """Get all stats for a specific game."""
    # Verify game exists
    game = storage.get_game_by_id(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} not found"
        )
    
    return storage.get_game_stats_by_game(game_id)


@app.post("/games/{game_id}/stats", response_model=List[GameStats], tags=["Game Stats"])
def add_bulk_game_stats(game_id: str, stats_data: BulkGameStatsCreate):
    """
    Add or update stats for multiple players in a game.
    
    This is the primary endpoint for entering game stats.
    """
    # Verify game exists
    game = storage.get_game_by_id(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} not found"
        )
    
    # Create GameStats objects
    game_stats = []
    for stat_data in stats_data.stats:
        # Verify player exists
        player = storage.get_player_by_id(stat_data.player_id)
        if not player:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Player with ID {stat_data.player_id} not found"
            )
        
        game_stat = GameStats(
            game_id=game_id,
            **stat_data.model_dump()
        )
        game_stats.append(game_stat)
    
    # Save all stats
    storage.save_multiple_game_stats(game_stats)
    return game_stats


@app.get("/players/{player_id}/stats", response_model=List[GameStats], tags=["Game Stats"])
def get_player_game_stats(player_id: str):
    """Get all game stats for a specific player."""
    # Verify player exists
    player = storage.get_player_by_id(player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {player_id} not found"
        )
    
    stats = storage.get_game_stats_by_player(player_id)
    # Sort by date, most recent first
    # We need to join with games to get dates, so let's do that
    games = {g.id: g for g in storage.get_games()}
    stats.sort(key=lambda s: games.get(s.game_id, Game(id="", date="", opponent="")).date, reverse=True)
    
    return stats


def convert_baseball_ip_to_actual_innings(ip: float) -> float:
    """
    Convert baseball innings pitched notation to actual fractional innings.
    
    In baseball scoring:
    - 1.0 = 1 full inning = 3 outs
    - 1.1 = 1 inning + 1 out = 1⅓ innings = 1.333...
    - 1.2 = 1 inning + 2 outs = 1⅔ innings = 1.666...
    
    The decimal portion represents outs (thirds), not tenths.
    
    Example:
        convert_baseball_ip_to_actual_innings(1.2) -> 1.667
        convert_baseball_ip_to_actual_innings(5.1) -> 5.333
    """
    full_innings = int(ip)
    # Extract the decimal portion and convert to outs (0, 1, or 2)
    outs = round((ip - full_innings) * 10)
    # Convert outs to fractional innings (divide by 3)
    return full_innings + (outs / 3.0)


@app.get("/players/{player_id}/stats/season", tags=["Game Stats"])
def get_player_season_stats(player_id: str):
    """
    Calculate and return season totals for a player.
    
    Aggregates all game stats into season totals and calculated stats (AVG, OBP, SLG, ERA, etc.)
    """
    # Verify player exists
    player = storage.get_player_by_id(player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {player_id} not found"
        )
    
    game_stats = storage.get_game_stats_by_player(player_id)
    
    if not game_stats:
        return {
            "player_id": player_id,
            "games_played": 0,
            "hitting": {},
            "pitching": {},
            "fielding": {}
        }
    
    # Aggregate hitting stats
    hitting = {
        "ab": sum(gs.ab or 0 for gs in game_stats),
        "r": sum(gs.r or 0 for gs in game_stats),
        "h": sum(gs.h or 0 for gs in game_stats),
        "doubles": sum(gs.doubles or 0 for gs in game_stats),
        "triples": sum(gs.triples or 0 for gs in game_stats),
        "hr": sum(gs.hr or 0 for gs in game_stats),
        "rbi": sum(gs.rbi or 0 for gs in game_stats),
        "bb": sum(gs.bb or 0 for gs in game_stats),
        "so": sum(gs.so or 0 for gs in game_stats),
        "sb": sum(gs.sb or 0 for gs in game_stats),
        "cs": sum(gs.cs or 0 for gs in game_stats),
    }
    
    # Calculate batting average, OBP, SLG
    if hitting["ab"] > 0:
        hitting["avg"] = round(hitting["h"] / hitting["ab"], 3)
        
        # Total bases for SLG
        total_bases = (hitting["h"] - hitting["doubles"] - hitting["triples"] - hitting["hr"]) + \
                     (hitting["doubles"] * 2) + (hitting["triples"] * 3) + (hitting["hr"] * 4)
        hitting["slg"] = round(total_bases / hitting["ab"], 3)
        
        # OBP = (H + BB) / (AB + BB)
        pa = hitting["ab"] + hitting["bb"]
        if pa > 0:
            hitting["obp"] = round((hitting["h"] + hitting["bb"]) / pa, 3)
        
        # OPS
        hitting["ops"] = round(hitting.get("obp", 0) + hitting.get("slg", 0), 3)
    
    # Aggregate pitching stats
    pitching = {
        "ip": sum(gs.ip or 0 for gs in game_stats),
        "h": sum(gs.h_allowed or 0 for gs in game_stats),
        "r": sum(gs.r_allowed or 0 for gs in game_stats),
        "er": sum(gs.er or 0 for gs in game_stats),
        "bb": sum(gs.bb_allowed or 0 for gs in game_stats),
        "k": sum(gs.k or 0 for gs in game_stats),
        "pitches": sum(gs.pitches or 0 for gs in game_stats),
    }
    
    # Calculate ERA and WHIP
    # Convert baseball IP notation (e.g., 1.2) to actual innings (e.g., 1.667)
    if pitching["ip"] > 0:
        actual_ip = convert_baseball_ip_to_actual_innings(pitching["ip"])
        pitching["era"] = round((pitching["er"] * 9) / actual_ip, 2)
        pitching["whip"] = round((pitching["h"] + pitching["bb"]) / actual_ip, 2)
    
    # Aggregate fielding stats
    fielding = {
        "po": sum(gs.po or 0 for gs in game_stats),
        "a": sum(gs.a or 0 for gs in game_stats),
        "e": sum(gs.e or 0 for gs in game_stats),
    }
    
    if (fielding["po"] + fielding["a"] + fielding["e"]) > 0:
        fielding["fpct"] = round((fielding["po"] + fielding["a"]) / 
                                (fielding["po"] + fielding["a"] + fielding["e"]), 3)
    
    return {
        "player_id": player_id,
        "games_played": len(game_stats),
        "hitting": hitting,
        "pitching": pitching,
        "fielding": fielding
    }


# --- Lyra (AI) endpoints ---

@app.post("/lyra/analyze", response_model=LyraResponse, tags=["Lyra"])
def analyze_with_lyra(request: LyraRequest):
    """
    Get coaching perspective from Lyra AI assistant.
    
    Lyra provides observations, patterns, and considerations.
    Lyra does NOT make decisions or optimize lineups.
    The coach is always the decision-maker.
    
    Send the current lineup, field positions, and optionally a specific question.
    Returns Lyra's advisory text.
    """
    # Check if Ollama is running
    if not lyra.check_connection():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Ollama. Make sure Ollama is running locally (try 'ollama serve')."
        )
    
    # Check if lyra-coach model is available
    models = lyra.list_models()
    if "lyra-coach:latest" not in models:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Lyra-coach model not found in Ollama. Please create it first."
        )
    
    try:
        # Call Lyra for analysis
        response = lyra.analyze(
            lineup=request.lineup,
            field_positions=request.field_positions,
            players=request.players,
            question=request.question,
        )
        return response
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Lyra: {str(e)}"
        )


@app.post("/lyra/chat/stream", tags=["Lyra"])
async def stream_chat_with_lyra(request: ChatRequest):
    """
    Stream a chat response from the configured AI provider.
    
    Supports Ollama, OpenAI, and Anthropic via the unified AIService.
    Returns a server-sent events (SSE) stream of text chunks.
    """
    # Convert Pydantic models to dicts for the service
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    return StreamingResponse(
        ai_service.stream_chat(messages, request.model),
        media_type="text/event-stream"
    )


# --- AI Settings endpoints ---

@app.get("/settings/ai", response_model=AIConfig, tags=["Settings"])
def get_ai_settings():
    """Get current AI configuration."""
    return ai_service.config


@app.put("/settings/ai", response_model=AIConfig, tags=["Settings"])
def update_ai_settings(config: AIConfig):
    """
    Update AI configuration.
    
    Switches providers or updates API keys/URLs.
    """
    ai_service.update_config(config)
    return ai_service.config


# --- Application startup ---

@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print("=" * 60)
    print("🧢 Dugout Baseball Coaching API")
    print("=" * 60)
    print("API running at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    print(f"Data directory: {storage.data_dir.absolute()}")
    
    # Check Ollama connection
    if lyra.check_connection():
        models = lyra.list_models()
        print("✓ Ollama connected")
        print(f"  Available models: {', '.join(models)}")
        if "lyra-coach:latest" in models:
            print("  ✓ lyra-coach:latest model ready")
        else:
            print("  ⚠ lyra-coach:latest model NOT found - AI features unavailable")
    else:
        print("✗ Ollama not connected - AI features unavailable")
        print("  Start Ollama with: ollama serve")
    
    print("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

