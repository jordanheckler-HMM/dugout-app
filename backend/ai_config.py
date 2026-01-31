from pydantic import BaseModel
from typing import Optional, Literal

class AIConfig(BaseModel):
    """
    Configuration for AI services.
    
    Determines which provider to use and how to connect to it.
    API keys are optional here - they can be passed via headers 
    or environment variables for security.
    """
    provider: Literal["ollama", "openai", "anthropic"] = "ollama"
    
    # Ollama settings
    ollama_url: str = "http://localhost:11434"
    
    # Model preferences
    # For Ollama: "lyra-coach:latest", "llama3", etc.
    # For Cloud: "gpt-4o", "claude-3-5-sonnet", etc.
    preferred_model: str = "lyra-coach:latest"
    
    # API Keys (optional, can be empty if expecting from env/headers)
    # In a real desktop app, we might store these in a secure local file
    openai_key: Optional[str] = None
    anthropic_key: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "provider": "ollama",
                "ollama_url": "http://localhost:11434",
                "preferred_model": "lyra-coach:latest"
            }
        }
