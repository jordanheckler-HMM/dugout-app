"""
JSON-based storage layer for the baseball coaching application.

This module provides a simple, human-readable persistence layer using JSON files.
All data is stored in the backend/data/ directory.

Design principles:
- Human-readable: JSON files can be inspected and even edited manually
- Simple: No complex database setup or migrations
- Local-first: All data stays on the coach's machine
- Atomic writes: Use temp files to prevent corruption
"""

import json
import os
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional
from models import Player, LineupSlot, FieldPosition, Configuration, Game, GameStats


class JSONStorage:
    """
    Handles all persistence operations using JSON files.
    
    Each data type gets its own JSON file:
    - players.json: List of all players
    - lineup.json: Current batting order
    - field.json: Current defensive positions
    - configurations.json: Saved lineup/field configurations
    """
    
    def __init__(self, data_dir: str = "data"):
        """
        Initialize storage with a data directory.

        Args:
            data_dir: Path to directory for JSON files (default: "data")
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

        # Initialize files with default data if they don't exist
        self._initialize_storage()
    
    def _initialize_storage(self):
        """Create default JSON files if they don't exist."""
        
        # Default empty players list
        if not self._file_path("players.json").exists():
            self.save("players.json", [])
        
        # Default lineup: 9 empty slots
        if not self._file_path("lineup.json").exists():
            default_lineup = [
                {"slot_number": i, "player_id": None}
                for i in range(1, 10)
            ]
            self.save("lineup.json", default_lineup)
        
        # Default field positions: all standard positions empty
        if not self._file_path("field.json").exists():
            default_field = [
                {"position": pos, "player_id": None}
                for pos in ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
            ]
            self.save("field.json", default_field)
        
        # Default empty configurations list
        if not self._file_path("configurations.json").exists():
            self.save("configurations.json", [])
        
        # Default empty games list
        if not self._file_path("games.json").exists():
            self.save("games.json", [])
        
        # Default empty game stats list
        if not self._file_path("game_stats.json").exists():
            self.save("game_stats.json", [])
    
    def _file_path(self, filename: str) -> Path:
        """Get full path for a data file."""
        return self.data_dir / filename
    
    def load(self, filename: str) -> Any:
        """
        Load data from a JSON file.
        
        Args:
            filename: Name of the JSON file
            
        Returns:
            Parsed JSON data (dict or list)
            
        Raises:
            FileNotFoundError: If file doesn't exist
            json.JSONDecodeError: If file contains invalid JSON
        """
        file_path = self._file_path(filename)
        with open(file_path, 'r') as f:
            return json.load(f)
    
    def save(self, filename: str, data: Any):
        """
        Save data to a JSON file atomically, with thread safety.

        Uses a temporary file and rename to ensure atomic writes
        (prevents corruption if write is interrupted).

        Args:
            filename: Name of the JSON file
            data: Data to serialize (must be JSON-serializable)
        """
        with self._lock:
            file_path = self._file_path(filename)
            temp_path = self._file_path(f"{filename}.tmp")

            # Write to temp file
            with open(temp_path, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Atomic rename
            temp_path.replace(file_path)
    
    # --- Player operations ---
    
    def get_players(self) -> List[Player]:
        """Get all players."""
        data = self.load("players.json")
        return [Player(**p) for p in data]
    
    def save_players(self, players: List[Player]):
        """Save all players."""
        data = [p.model_dump() for p in players]
        self.save("players.json", data)
    
    def get_player_by_id(self, player_id: str) -> Optional[Player]:
        """Get a specific player by ID."""
        players = self.get_players()
        for player in players:
            if player.id == player_id:
                return player
        return None
    
    def add_player(self, player: Player) -> Player:
        """Add a new player."""
        players = self.get_players()
        players.append(player)
        self.save_players(players)
        return player
    
    def update_player(self, player_id: str, updated_data: Dict[str, Any]) -> Optional[Player]:
        """
        Update a player's data.
        
        Args:
            player_id: ID of player to update
            updated_data: Dictionary of fields to update
            
        Returns:
            Updated player, or None if not found
        """
        players = self.get_players()
        for i, player in enumerate(players):
            if player.id == player_id:
                # Merge updates into existing player data
                player_dict = player.model_dump()
                player_dict.update(updated_data)
                updated_player = Player(**player_dict)
                players[i] = updated_player
                self.save_players(players)
                return updated_player
        return None
    
    def cascade_delete_player_references(self, player_id: str) -> dict:
        """
        Remove all references to a player from lineup, field, and configurations.
        Returns a summary of what was cleaned up.
        """
        cleanup_summary = {
            'lineup_slots_cleared': 0,
            'field_positions_cleared': 0,
            'configurations_updated': 0
        }
        
        # Clean up lineup
        lineup = self.get_lineup()
        for slot in lineup:
            if slot.player_id == player_id:
                slot.player_id = None
                cleanup_summary['lineup_slots_cleared'] += 1
        if cleanup_summary['lineup_slots_cleared'] > 0:
            self.save_lineup(lineup)
        
        # Clean up field positions
        field = self.get_field()
        for pos in field:
            if pos.player_id == player_id:
                pos.player_id = None
                cleanup_summary['field_positions_cleared'] += 1
        if cleanup_summary['field_positions_cleared'] > 0:
            self.save_field(field)
        
        # Clean up configurations
        configs = self.get_configurations()
        for config in configs:
            config_modified = False
            
            # Clean lineup slots in config
            for slot in config.lineup:
                if slot.player_id == player_id:
                    slot.player_id = None
                    config_modified = True
            
            # Clean field positions in config
            for pos in config.field_positions:
                if pos.player_id == player_id:
                    pos.player_id = None
                    config_modified = True
            
            if config_modified:
                cleanup_summary['configurations_updated'] += 1
        
        if cleanup_summary['configurations_updated'] > 0:
            self._save_configurations(configs)
        
        return cleanup_summary
    
    # --- Lineup operations ---
    
    def get_lineup(self) -> List[LineupSlot]:
        """Get current batting order."""
        data = self.load("lineup.json")
        return [LineupSlot(**slot) for slot in data]
    
    def save_lineup(self, lineup: List[LineupSlot]):
        """Save batting order."""
        data = [slot.model_dump() for slot in lineup]
        self.save("lineup.json", data)
    
    # --- Field position operations ---
    
    def get_field(self) -> List[FieldPosition]:
        """Get current defensive positions."""
        data = self.load("field.json")
        return [FieldPosition(**pos) for pos in data]
    
    def save_field(self, field_positions: List[FieldPosition]):
        """Save defensive positions."""
        data = [pos.model_dump() for pos in field_positions]
        self.save("field.json", data)
    
    # --- Configuration operations ---
    
    def get_configurations(self) -> List[Configuration]:
        """Get all saved configurations."""
        data = self.load("configurations.json")
        return [Configuration(**cfg) for cfg in data]
    
    def get_configuration_by_id(self, config_id: str) -> Optional[Configuration]:
        """Get a specific configuration by ID."""
        configs = self.get_configurations()
        for config in configs:
            if config.id == config_id:
                return config
        return None
    
    def save_configuration(self, config: Configuration) -> Configuration:
        """
        Save a new configuration or update existing one.
        
        Uses dict-based upsert to avoid race conditions.
        """
        configs = self.get_configurations()
        
        # Convert to dict for O(1) lookup and upsert
        config_dict = {c.id: c for c in configs}
        
        # Upsert the configuration
        config_dict[config.id] = config
        
        # Convert back to list and save atomically
        updated_configs = list(config_dict.values())
        self._save_configurations(updated_configs)
        
        return config
    
    def _save_configurations(self, configs: List[Configuration]):
        """Internal method to save all configurations."""
        data = [cfg.model_dump() for cfg in configs]
        self.save("configurations.json", data)
    
    # --- Game operations ---
    
    def get_games(self) -> List[Game]:
        """Get all games."""
        data = self.load("games.json")
        return [Game(**g) for g in data]
    
    def get_game_by_id(self, game_id: str) -> Optional[Game]:
        """Get a specific game by ID."""
        games = self.get_games()
        for game in games:
            if game.id == game_id:
                return game
        return None
    
    def add_game(self, game: Game) -> Game:
        """Add a new game."""
        games = self.get_games()
        games.append(game)
        self._save_games(games)
        return game
    
    def update_game(self, game_id: str, updated_data: Dict[str, Any]) -> Optional[Game]:
        """Update a game's data."""
        games = self.get_games()
        for i, game in enumerate(games):
            if game.id == game_id:
                game_dict = game.model_dump()
                game_dict.update(updated_data)
                updated_game = Game(**game_dict)
                games[i] = updated_game
                self._save_games(games)
                return updated_game
        return None
    
    def delete_game(self, game_id: str) -> bool:
        """Delete a game and all its stats."""
        games = self.get_games()
        original_count = len(games)
        games = [g for g in games if g.id != game_id]
        
        if len(games) < original_count:
            self._save_games(games)
            # Also delete all stats for this game
            self.delete_game_stats_by_game(game_id)
            return True
        return False
    
    def _save_games(self, games: List[Game]):
        """Internal method to save all games."""
        data = [g.model_dump() for g in games]
        self.save("games.json", data)
    
    # --- Game Stats operations ---
    
    def get_all_game_stats(self) -> List[GameStats]:
        """Get all game stats."""
        data = self.load("game_stats.json")
        return [GameStats(**gs) for gs in data]
    
    def get_game_stats_by_game(self, game_id: str) -> List[GameStats]:
        """Get all stats for a specific game."""
        all_stats = self.get_all_game_stats()
        return [gs for gs in all_stats if gs.game_id == game_id]
    
    def get_game_stats_by_player(self, player_id: str) -> List[GameStats]:
        """Get all game stats for a specific player."""
        all_stats = self.get_all_game_stats()
        return [gs for gs in all_stats if gs.player_id == player_id]
    
    def get_game_stat(self, game_id: str, player_id: str) -> Optional[GameStats]:
        """Get stats for a specific player in a specific game."""
        all_stats = self.get_all_game_stats()
        for stat in all_stats:
            if stat.game_id == game_id and stat.player_id == player_id:
                return stat
        return None
    
    def save_game_stat(self, game_stat: GameStats) -> GameStats:
        """Save or update game stats for a player."""
        all_stats = self.get_all_game_stats()
        
        # Check if stat already exists for this game/player combination
        for i, stat in enumerate(all_stats):
            if stat.game_id == game_stat.game_id and stat.player_id == game_stat.player_id:
                all_stats[i] = game_stat
                self._save_all_game_stats(all_stats)
                return game_stat
        
        # Add new stat
        all_stats.append(game_stat)
        self._save_all_game_stats(all_stats)
        return game_stat
    
    def save_multiple_game_stats(self, game_stats: List[GameStats]) -> List[GameStats]:
        """Save multiple game stats at once (bulk operation)."""
        all_stats = self.get_all_game_stats()
        
        # Create a lookup dict for existing stats
        stats_dict = {
            (stat.game_id, stat.player_id): stat 
            for stat in all_stats
        }
        
        # Update or add new stats
        for game_stat in game_stats:
            key = (game_stat.game_id, game_stat.player_id)
            stats_dict[key] = game_stat
        
        # Save all stats in one write
        self._save_all_game_stats(list(stats_dict.values()))
        return game_stats
    
    def delete_game_stats_by_game(self, game_id: str) -> int:
        """Delete all stats for a specific game. Returns count of deleted stats."""
        all_stats = self.get_all_game_stats()
        original_count = len(all_stats)
        all_stats = [gs for gs in all_stats if gs.game_id != game_id]
        deleted_count = original_count - len(all_stats)
        
        if deleted_count > 0:
            self._save_all_game_stats(all_stats)
        
        return deleted_count
    
    def _save_all_game_stats(self, stats: List[GameStats]):
        """Internal method to save all game stats."""
        data = [gs.model_dump() for gs in stats]
        self.save("game_stats.json", data)


