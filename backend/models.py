"""
Data models for the baseball coaching application.

All models use Pydantic for validation and serialization.
These models represent the core domain objects: players, lineups, field positions, and configurations.
"""

import re
from datetime import date as dt_date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator

# Constants for validation
VALID_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']
VALID_HANDEDNESS = ['L', 'R', 'S']
VALID_THROWS = ['L', 'R']
VALID_STATUS = ['active', 'inactive', 'archived']
VALID_HOME_AWAY = ['home', 'away']
VALID_RESULT = ['W', 'L', 'T']


def validate_iso_date(v: str) -> str:
    """Validate that a date string is in YYYY-MM-DD format and is a real date."""
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
        raise ValueError('Date must be in YYYY-MM-DD format')
    try:
        dt_date.fromisoformat(v)
    except ValueError:
        raise ValueError('Invalid date value')
    return v


class Player(BaseModel):
    """
    Represents a player on the team.
    
    Fields:
    - id: Unique identifier (string)
    - name: Player's full name
    - number: Jersey number (optional)
    - primary_position: Main/natural position (e.g., "SS", "2B")
    - secondary_positions: List of other positions player can play adequately
    - bats: Batting hand ("R", "L", "S" for switch)
    - throws: Throwing hand ("R" or "L")
    - status: Player availability status ("active", "inactive", "archived")
    - notes: Free-form coach notes
    """
    id: str
    name: str
    number: Optional[int] = None
    primary_position: str
    secondary_positions: Optional[List[str]] = []
    bats: str  # "R", "L", or "S"
    throws: str  # "R" or "L"
    status: Optional[str] = "active"  # "active", "inactive", or "archived"
    notes: Optional[str] = ""


class LineupSlot(BaseModel):
    """
    Represents one slot in the batting order.
    
    Fields:
    - slot_number: Position in batting order (1-9)
    - player_id: ID of player in this slot (null if empty)
    """
    slot_number: int = Field(..., ge=1, le=9)
    player_id: Optional[str] = None


class FieldPosition(BaseModel):
    """
    Represents a defensive field position.
    
    Fields:
    - position: Position abbreviation (P, C, 1B, 2B, 3B, SS, LF, CF, RF)
    - player_id: ID of player at this position (null if empty)
    """
    position: str
    player_id: Optional[str] = None
    
    @field_validator('position')
    @classmethod
    def validate_position(cls, v):
        if v not in VALID_POSITIONS:
            raise ValueError(f'Position must be one of: {", ".join(VALID_POSITIONS)}')
        return v


class Configuration(BaseModel):
    """
    Represents a saved lineup/field configuration.
    
    Allows coaches to save and recall different lineup arrangements
    (e.g., "Late Inning Defense", "Starting Lineup", "Practice Rotation")
    
    Fields:
    - id: Unique identifier
    - name: Descriptive name for this configuration
    - lineup: Array of 9 LineupSlot objects
    - field_positions: Array of FieldPosition objects
    - use_dh: Whether the DH rule is being used
    - notes: Optional notes about when/why to use this config
    - last_used_timestamp: When this config was last loaded
    """
    id: str
    name: str
    lineup: List[LineupSlot]
    field_positions: List[FieldPosition]
    use_dh: bool = True
    notes: Optional[str] = ""
    last_used_timestamp: Optional[str] = None


class LyraRequest(BaseModel):
    """
    Request to Lyra for coaching perspective.
    
    Fields:
    - lineup: Current batting order (list of LineupSlot)
    - field_positions: Current defensive positions (list of FieldPosition)
    - players: All players (for context about abilities, handedness, etc.)
    - question: Optional specific question from the coach
    """
    lineup: List[LineupSlot]
    field_positions: List[FieldPosition]
    players: List[Player]
    question: Optional[str] = None


class LyraResponse(BaseModel):
    """
    Response from Lyra with coaching perspective.
    
    Fields:
    - analysis: Lyra's advisory text (verbatim from model)
    - timestamp: When the analysis was generated
    """
    analysis: str
    timestamp: str


class ChatMessage(BaseModel):
    """
    Single message in a chat conversation.
    """
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., max_length=10000)


class ChatRequest(BaseModel):
    """
    Request for AI chat completion/streaming.
    """
    messages: List[ChatMessage] = Field(..., max_length=50)
    model: Optional[str] = Field(None, max_length=100)


class PlayerCreate(BaseModel):
    """Request model for creating a new player."""
    name: str = Field(..., min_length=2, max_length=50)
    number: Optional[int] = Field(None, ge=1, le=99)
    primary_position: str
    secondary_positions: Optional[List[str]] = []
    bats: str
    throws: str
    notes: Optional[str] = ""
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty or just whitespace')
        return v
    
    @field_validator('primary_position')
    @classmethod
    def validate_primary_position(cls, v):
        if v not in VALID_POSITIONS:
            raise ValueError(f'Primary position must be one of: {", ".join(VALID_POSITIONS)}')
        return v
    
    @field_validator('secondary_positions')
    @classmethod
    def validate_secondary_positions(cls, v):
        if v:
            for pos in v:
                if pos not in VALID_POSITIONS:
                    raise ValueError(f'Invalid secondary position "{pos}". Must be one of: {", ".join(VALID_POSITIONS)}')
        return v
    
    @field_validator('bats')
    @classmethod
    def validate_bats(cls, v):
        if v not in VALID_HANDEDNESS:
            raise ValueError(f'Bats must be one of: {", ".join(VALID_HANDEDNESS)}')
        return v
    
    @field_validator('throws')
    @classmethod
    def validate_throws(cls, v):
        if v not in VALID_THROWS:
            raise ValueError(f'Throws must be one of: {", ".join(VALID_THROWS)}')
        return v


class PlayerUpdate(BaseModel):
    """Request model for updating a player (all fields optional)."""
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    number: Optional[int] = Field(None, ge=1, le=99)
    primary_position: Optional[str] = None
    secondary_positions: Optional[List[str]] = None
    bats: Optional[str] = None
    throws: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Name cannot be empty or just whitespace')
        return v
    
    @field_validator('primary_position')
    @classmethod
    def validate_primary_position(cls, v):
        if v is not None and v not in VALID_POSITIONS:
            raise ValueError(f'Primary position must be one of: {", ".join(VALID_POSITIONS)}')
        return v
    
    @field_validator('secondary_positions')
    @classmethod
    def validate_secondary_positions(cls, v):
        if v:
            for pos in v:
                if pos not in VALID_POSITIONS:
                    raise ValueError(f'Invalid secondary position "{pos}". Must be one of: {", ".join(VALID_POSITIONS)}')
        return v
    
    @field_validator('bats')
    @classmethod
    def validate_bats(cls, v):
        if v is not None and v not in VALID_HANDEDNESS:
            raise ValueError(f'Bats must be one of: {", ".join(VALID_HANDEDNESS)}')
        return v
    
    @field_validator('throws')
    @classmethod
    def validate_throws(cls, v):
        if v is not None and v not in VALID_THROWS:
            raise ValueError(f'Throws must be one of: {", ".join(VALID_THROWS)}')
        return v
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in VALID_STATUS:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUS)}')
        return v


class LineupUpdate(BaseModel):
    """Request model for updating the entire lineup."""
    lineup: List[LineupSlot]


class FieldUpdate(BaseModel):
    """Request model for updating field positions."""
    field_positions: List[FieldPosition]


class ConfigurationCreate(BaseModel):
    """Request model for creating a new configuration."""
    name: str = Field(..., min_length=1, max_length=100)
    lineup: List[LineupSlot]
    field_positions: List[FieldPosition]
    use_dh: bool = True
    notes: Optional[str] = ""
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Configuration name cannot be empty or just whitespace')
        return v


class GameStats(BaseModel):
    """
    Individual game statistics for a player.
    Represents a player's performance in a single game.
    """
    game_id: str
    player_id: str

    # Hitting stats
    ab: Optional[int] = Field(0, ge=0)  # At bats
    r: Optional[int] = Field(0, ge=0)   # Runs scored
    h: Optional[int] = Field(0, ge=0)   # Hits
    doubles: Optional[int] = Field(0, ge=0)  # 2B
    triples: Optional[int] = Field(0, ge=0)  # 3B
    hr: Optional[int] = Field(0, ge=0)  # Home runs
    rbi: Optional[int] = Field(0, ge=0)  # Runs batted in
    bb: Optional[int] = Field(0, ge=0)  # Walks
    so: Optional[int] = Field(0, ge=0)  # Strikeouts
    sb: Optional[int] = Field(0, ge=0)  # Stolen bases
    cs: Optional[int] = Field(0, ge=0)  # Caught stealing

    # Pitching stats
    ip: Optional[float] = Field(0.0, ge=0.0)  # Innings pitched
    h_allowed: Optional[int] = Field(0, ge=0)  # Hits allowed
    r_allowed: Optional[int] = Field(0, ge=0)  # Runs allowed
    er: Optional[int] = Field(0, ge=0)  # Earned runs
    bb_allowed: Optional[int] = Field(0, ge=0)  # Walks allowed
    k: Optional[int] = Field(0, ge=0)  # Strikeouts (pitching)
    pitches: Optional[int] = Field(0, ge=0)  # Pitch count

    # Fielding stats
    po: Optional[int] = Field(0, ge=0)  # Putouts
    a: Optional[int] = Field(0, ge=0)   # Assists
    e: Optional[int] = Field(0, ge=0)   # Errors

    position_played: Optional[List[str]] = []
    innings_played: Optional[float] = Field(0.0, ge=0.0)


class Game(BaseModel):
    """
    Represents a single game.
    Used to organize stats and track season progress.
    """
    id: str
    date: str  # ISO format date string
    opponent: str
    home_away: str = "home"  # "home" or "away"
    result: Optional[str] = None  # "W", "L", or "T"
    score_us: Optional[int] = None
    score_them: Optional[int] = None
    notes: Optional[str] = ""
    created_at: Optional[str] = None


class GameCreate(BaseModel):
    """Request model for creating a new game."""
    date: str
    opponent: str = Field(..., min_length=1, max_length=100)
    home_away: str = "home"
    result: Optional[str] = None
    score_us: Optional[int] = Field(None, ge=0)
    score_them: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = ""
    
    @field_validator('opponent')
    @classmethod
    def validate_opponent(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Opponent name cannot be empty or just whitespace')
        return v
    
    @field_validator('home_away')
    @classmethod
    def validate_home_away(cls, v):
        if v not in VALID_HOME_AWAY:
            raise ValueError(f'home_away must be one of: {", ".join(VALID_HOME_AWAY)}')
        return v
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        return validate_iso_date(v)

    @field_validator('result')
    @classmethod
    def validate_result(cls, v):
        if v is not None and v not in VALID_RESULT:
            raise ValueError(f'Result must be one of: {", ".join(VALID_RESULT)}')
        return v


class GameUpdate(BaseModel):
    """Request model for updating a game."""
    date: Optional[str] = None
    opponent: Optional[str] = Field(None, min_length=1, max_length=100)
    home_away: Optional[str] = None
    result: Optional[str] = None
    score_us: Optional[int] = Field(None, ge=0)
    score_them: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    
    @field_validator('opponent')
    @classmethod
    def validate_opponent(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Opponent name cannot be empty or just whitespace')
        return v
    
    @field_validator('home_away')
    @classmethod
    def validate_home_away(cls, v):
        if v is not None and v not in VALID_HOME_AWAY:
            raise ValueError(f'home_away must be one of: {", ".join(VALID_HOME_AWAY)}')
        return v
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        if v is not None:
            return validate_iso_date(v)
        return v

    @field_validator('result')
    @classmethod
    def validate_result(cls, v):
        if v is not None and v not in VALID_RESULT:
            raise ValueError(f'Result must be one of: {", ".join(VALID_RESULT)}')
        return v


class GameStatsCreate(BaseModel):
    """Request model for creating/updating game stats for a player."""
    player_id: str
    ab: Optional[int] = Field(0, ge=0)
    r: Optional[int] = Field(0, ge=0)
    h: Optional[int] = Field(0, ge=0)
    doubles: Optional[int] = Field(0, ge=0)
    triples: Optional[int] = Field(0, ge=0)
    hr: Optional[int] = Field(0, ge=0)
    rbi: Optional[int] = Field(0, ge=0)
    bb: Optional[int] = Field(0, ge=0)
    so: Optional[int] = Field(0, ge=0)
    sb: Optional[int] = Field(0, ge=0)
    cs: Optional[int] = Field(0, ge=0)
    ip: Optional[float] = Field(0.0, ge=0.0)
    h_allowed: Optional[int] = Field(0, ge=0)
    r_allowed: Optional[int] = Field(0, ge=0)
    er: Optional[int] = Field(0, ge=0)
    bb_allowed: Optional[int] = Field(0, ge=0)
    k: Optional[int] = Field(0, ge=0)
    pitches: Optional[int] = Field(0, ge=0)
    po: Optional[int] = Field(0, ge=0)
    a: Optional[int] = Field(0, ge=0)
    e: Optional[int] = Field(0, ge=0)
    position_played: Optional[List[str]] = []
    innings_played: Optional[float] = Field(0.0, ge=0.0)


class BulkGameStatsCreate(BaseModel):
    """Request model for creating stats for multiple players in a game."""
    game_id: str
    stats: List[GameStatsCreate]

