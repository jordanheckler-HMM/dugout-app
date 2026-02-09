from pydantic import BaseModel
from typing import Optional, Literal, Tuple

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


class AIConfigResponse(BaseModel):
    """
    Response model for AI configuration that redacts API keys.
    Only shows whether a key is set and its last 4 characters.
    """
    provider: Literal["ollama", "openai", "anthropic"] = "ollama"
    ollama_url: str = "http://localhost:11434"
    preferred_model: str = "lyra-coach:latest"
    openai_key_set: bool = False
    openai_key_hint: str = ""
    anthropic_key_set: bool = False
    anthropic_key_hint: str = ""

    @staticmethod
    def _redact(key: Optional[str]) -> Tuple[bool, str]:
        """Mask an API key, showing only last 4 characters."""
        if key and len(key) >= 4:
            return True, f"...{key[-4:]}"
        elif key:
            return True, "...****"
        return False, ""

    @staticmethod
    def from_config(config: "AIConfig") -> "AIConfigResponse":
        oai_set, oai_hint = AIConfigResponse._redact(config.openai_key)
        ant_set, ant_hint = AIConfigResponse._redact(config.anthropic_key)

        return AIConfigResponse(
            provider=config.provider,
            ollama_url=config.ollama_url,
            preferred_model=config.preferred_model,
            openai_key_set=oai_set,
            openai_key_hint=oai_hint,
            anthropic_key_set=ant_set,
            anthropic_key_hint=ant_hint,
        )
