import httpx
import json
import logging
import os
from typing import List, Dict, AsyncGenerator, Any
from ai_config import AIConfig

logger = logging.getLogger("dugout")


class AIService:
    """
    Unified AI Service for Dugout App.

    Handles routing requests associated with:
    - Local Ollama instance
    - OpenAI API
    - Anthropic API

    Supports both standard chat and streaming responses.
    """

    def __init__(self, config: AIConfig):
        self.config = config

    def update_config(self, config: AIConfig):
        """Update the active configuration."""
        self.config = config

    @staticmethod
    def _extract_error_message(payload: str, default: str) -> str:
        """Extract provider error message from JSON/plain response payload."""
        if not payload:
            return default
        try:
            parsed = json.loads(payload)
            if isinstance(parsed, dict):
                for key in ("error", "message", "detail"):
                    value = parsed.get(key)
                    if isinstance(value, str) and value.strip():
                        return value.strip()
        except Exception:
            pass
        cleaned = payload.strip()
        return cleaned or default

    @staticmethod
    def _is_model_not_found_error(error_text: str) -> bool:
        lowered = error_text.lower()
        return "model" in lowered and "not found" in lowered

    async def check_connection(self) -> bool:
        """Check connection to the currently configured provider."""
        if self.config.provider == "ollama":
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"{self.config.ollama_url}/api/tags", timeout=3.0
                    )
                    return resp.status_code == 200
            except Exception:
                return False
        elif self.config.provider == "openai":
            # Simple check or just assume true if key exists
            return bool(self.config.openai_key or os.getenv("OPENAI_API_KEY"))
        elif self.config.provider == "anthropic":
            return bool(self.config.anthropic_key or os.getenv("ANTHROPIC_API_KEY"))
        return False

    async def chat(self, messages: List[Dict[str, str]], model_id: str = None) -> str:
        """
        Send a chat message to the configured provider and get the full response text.
        """
        # Collect stream for simple implementation
        response_text = ""
        async for chunk in self.stream_chat(messages, model_id):
            response_text += chunk
        return response_text

    async def stream_chat(
        self, messages: List[Dict[str, str]], model_id: str = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response from the configured provider.
        Yields chunks of text content.
        """
        model = model_id or self.config.preferred_model

        if self.config.provider == "ollama":
            async for chunk in self._stream_ollama(messages, model):
                yield chunk
        elif self.config.provider == "openai":
            async for chunk in self._stream_openai(messages, model):
                yield chunk
        elif self.config.provider == "anthropic":
            async for chunk in self._stream_anthropic(messages, model):
                yield chunk
        else:
            yield f"Error: Unknown provider '{self.config.provider}'"

    # --- OLLAMA IMPLEMENTATION ---
    async def _stream_ollama(self, messages: List[Dict[str, str]], model: str):
        url = f"{self.config.ollama_url}/api/chat"
        candidate_models: List[str] = []
        for candidate in [
            model,
            f"{model}:latest" if ":" not in model else None,
            self.config.preferred_model,
            (
                f"{self.config.preferred_model}:latest"
                if self.config.preferred_model and ":" not in self.config.preferred_model
                else None
            ),
            "lyra-coach:latest",
        ]:
            if candidate and candidate not in candidate_models:
                candidate_models.append(candidate)

        last_error = "Ollama returned an empty response."

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                for candidate_model in candidate_models:
                    payload = {
                        "model": candidate_model,
                        "messages": messages,
                        "stream": True,
                    }
                    content_sent = False

                    async with client.stream("POST", url, json=payload) as response:
                        if response.status_code >= 400:
                            body = (await response.aread()).decode("utf-8", errors="replace")
                            last_error = self._extract_error_message(
                                body,
                                f"Ollama request failed with status {response.status_code}.",
                            )
                            if self._is_model_not_found_error(last_error):
                                logger.warning(
                                    "Ollama model '%s' unavailable. Trying fallback model.",
                                    candidate_model,
                                )
                                continue
                            yield f"\n[AI Error: {last_error}]"
                            return

                        stream_error = None
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            try:
                                data = json.loads(line)
                            except json.JSONDecodeError:
                                continue

                            if isinstance(data, dict) and data.get("error"):
                                stream_error = str(data["error"])
                                break

                            if "message" in data and "content" in data["message"]:
                                chunk = data["message"]["content"]
                                if chunk:
                                    content_sent = True
                                    yield chunk
                            if data.get("done"):
                                break

                        if content_sent:
                            return

                        if stream_error:
                            last_error = stream_error
                            if self._is_model_not_found_error(stream_error):
                                logger.warning(
                                    "Ollama model '%s' returned not-found during stream. Trying fallback model.",
                                    candidate_model,
                                )
                                continue
                            yield f"\n[AI Error: {stream_error}]"
                            return

                yield f"\n[AI Error: {last_error}]"
        except Exception:
            logger.exception("Ollama streaming error")
            yield "\n[AI Error: Connection failed. Check that Ollama is running.]"

    # --- OPENAI IMPLEMENTATION ---
    async def _stream_openai(self, messages: List[Dict[str, str]], model: str):
        api_key = self.config.openai_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            yield "[Error: Missing OpenAI API Key]"
            return

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {"model": model, "messages": messages, "stream": True}

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code >= 400:
                        body = (await response.aread()).decode("utf-8", errors="replace")
                        error_message = self._extract_error_message(
                            body,
                            f"OpenAI request failed with status {response.status_code}.",
                        )
                        yield f"\n[AI Error: {error_message}]"
                        return

                    async for line in response.aiter_lines():
                        if not line or line.strip() == "data: [DONE]":
                            continue
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                if isinstance(data, dict) and data.get("error"):
                                    error_message = self._extract_error_message(
                                        json.dumps(data),
                                        "OpenAI returned an error.",
                                    )
                                    yield f"\n[AI Error: {error_message}]"
                                    return
                                delta = data["choices"][0]["delta"]
                                if "content" in delta:
                                    yield delta["content"]
                            except Exception:
                                continue
        except Exception:
            logger.exception("OpenAI streaming error")
            yield "\n[AI Error: Failed to get response from OpenAI.]"

    # --- ANTHROPIC IMPLEMENTATION ---
    async def _stream_anthropic(self, messages: List[Dict[str, str]], model: str):
        api_key = self.config.anthropic_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            yield "[Error: Missing Anthropic API Key]"
            return

        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        # Anthropic 'system' message must be top-level, not in messages list
        system_prompt = None
        filtered_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            else:
                filtered_messages.append(msg)

        payload = {
            "model": model,
            "messages": filtered_messages,
            "stream": True,
            "max_tokens": 4096,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code >= 400:
                        body = (await response.aread()).decode("utf-8", errors="replace")
                        error_message = self._extract_error_message(
                            body,
                            f"Anthropic request failed with status {response.status_code}.",
                        )
                        yield f"\n[AI Error: {error_message}]"
                        return

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        try:
                            data = json.loads(line[6:])
                            if isinstance(data, dict) and data.get("type") == "error":
                                error_message = self._extract_error_message(
                                    json.dumps(data),
                                    "Anthropic returned an error.",
                                )
                                yield f"\n[AI Error: {error_message}]"
                                return
                            if (
                                data["type"] == "content_block_delta"
                                and "delta" in data
                            ):
                                if "text" in data["delta"]:
                                    yield data["delta"]["text"]
                        except Exception:
                            continue
        except Exception:
            logger.exception("Anthropic streaming error")
            yield "\n[AI Error: Failed to get response from Anthropic.]"
