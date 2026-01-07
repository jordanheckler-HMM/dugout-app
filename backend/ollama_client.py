"""
Ollama client for Lyra coaching perspective assistant.

This module handles communication with the local Ollama instance
to provide AI-powered coaching insights.

Key principles:
- Local-only: Talks to Ollama at localhost:11434
- Advisory-only: Returns perspective, not decisions
- Transparent: Returns Ollama output verbatim
- Resilient: Handles connection errors gracefully
"""

import httpx
from typing import List, Optional
from datetime import datetime
from models import Player, LineupSlot, FieldPosition, LyraResponse


class LyraClient:
    """
    Client for communicating with the Lyra coaching assistant via Ollama.
    
    Lyra is a local AI model that provides coaching perspective,
    observations, and considerations - never commands or automatic decisions.
    """
    
    def __init__(self, base_url: str = "http://localhost:11434", model_name: str = "lyra-coach:latest"):
        """
        Initialize the Lyra client.
        
        Args:
            base_url: Ollama API base URL (default: http://localhost:11434)
            model_name: Name of the Ollama model to use (default: lyra-coach:latest)
        """
        self.base_url = base_url
        self.model_name = model_name
        self.timeout = 60.0  # 60 second timeout for AI generation
    
    def analyze(
        self,
        lineup: List[LineupSlot],
        field_positions: List[FieldPosition],
        players: List[Player],
        question: Optional[str] = None
    ) -> LyraResponse:
        """
        Request coaching perspective from Lyra.
        
        Args:
            lineup: Current batting order
            field_positions: Current defensive positions
            players: All players (for context)
            question: Optional specific question from coach
            
        Returns:
            LyraResponse with analysis text and timestamp
            
        Raises:
            httpx.ConnectError: If Ollama is not running
            httpx.TimeoutException: If generation takes too long
        """
        # Build the context prompt
        prompt = self._build_prompt(lineup, field_positions, players, question)
        
        # Call Ollama API
        try:
            response = self._call_ollama(prompt)
            return LyraResponse(
                analysis=response,
                timestamp=datetime.now().isoformat()
            )
        except httpx.ConnectError:
            raise Exception(
                "Cannot connect to Ollama. "
                "Make sure Ollama is running (try 'ollama serve' in terminal)."
            )
        except httpx.TimeoutException:
            raise Exception(
                "Ollama request timed out. The model may be taking too long to respond."
            )
    
    def _build_prompt(
        self,
        lineup: List[LineupSlot],
        field_positions: List[FieldPosition],
        players: List[Player],
        question: Optional[str]
    ) -> str:
        """
        Build the prompt to send to Lyra.
        
        Formats current game state into a clear, readable prompt
        that gives Lyra the context needed for coaching perspective.
        """
        # Create player lookup dictionary
        player_dict = {p.id: p for p in players}
        
        # Format lineup section
        lineup_text = "BATTING ORDER:\n"
        for slot in sorted(lineup, key=lambda s: s.slot_number):
            if slot.player_id and slot.player_id in player_dict:
                player = player_dict[slot.player_id]
                lineup_text += f"{slot.slot_number}. #{player.number} {player.name} ({player.bats}/{player.throws})\n"
            else:
                lineup_text += f"{slot.slot_number}. (empty)\n"
        
        # Format field positions section
        field_text = "\nDEFENSIVE POSITIONS:\n"
        position_order = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
        for pos in position_order:
            field_pos = next((fp for fp in field_positions if fp.position == pos), None)
            if field_pos and field_pos.player_id and field_pos.player_id in player_dict:
                player = player_dict[field_pos.player_id]
                field_text += f"{pos}: #{player.number} {player.name}\n"
            else:
                field_text += f"{pos}: (empty)\n"
        
        # Format player notes section (if any have notes)
        notes_text = ""
        players_with_notes = [p for p in players if p.notes and p.notes.strip()]
        if players_with_notes:
            notes_text = "\nPLAYER NOTES:\n"
            for player in players_with_notes:
                notes_text += f"#{player.number} {player.name}: {player.notes}\n"
        
        # Combine everything
        full_prompt = f"""You are Lyra, a coaching perspective assistant for youth baseball.
You provide observations, patterns, and considerations.
You do NOT make decisions, optimize lineups, or give commands.
The coach is always the decision-maker.
Be concise, specific, and highlight tradeoffs when relevant.

CURRENT SITUATION:

{lineup_text}
{field_text}
{notes_text}
"""
        
        # Add coach's question if provided
        if question and question.strip():
            full_prompt += f"\nCOACH'S QUESTION:\n{question}\n"
            full_prompt += "\nProvide your perspective on the coach's question based on the current situation."
        else:
            full_prompt += "\nProvide observations and considerations about this lineup and defensive alignment."
        
        return full_prompt
    
    def _call_ollama(self, prompt: str) -> str:
        """
        Make the actual HTTP call to Ollama API.
        
        Uses the /api/generate endpoint with streaming disabled
        for simplicity (gets complete response at once).
        
        Args:
            prompt: The formatted prompt to send
            
        Returns:
            Generated text from Lyra
        """
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,  # Get complete response at once
            "options": {
                "temperature": 0.7,  # Some creativity, but mostly consistent
                "top_p": 0.9,
            }
        }
        
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
    
    def check_connection(self) -> bool:
        """
        Check if Ollama is running and responsive.
        
        Returns:
            True if Ollama is accessible, False otherwise
        """
        try:
            url = f"{self.base_url}/api/tags"
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url)
                return response.status_code == 200
        except Exception:
            return False
    
    def list_models(self) -> List[str]:
        """
        List available models in Ollama.
        
        Useful for checking if lyra-coach:latest model is installed.
        
        Returns:
            List of model names
        """
        try:
            url = f"{self.base_url}/api/tags"
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url)
                response.raise_for_status()
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
        except Exception:
            return []

