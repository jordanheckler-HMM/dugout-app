from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main as backend_main
from models import LyraResponse
from storage import JSONStorage


class DummyLyraClient:
    """Deterministic Lyra stub used by integration tests."""

    def check_connection(self) -> bool:
        return True

    def list_models(self) -> list[str]:
        return ["lyra-coach:latest"]

    def analyze(self, lineup, field_positions, players, question=None) -> LyraResponse:
        return LyraResponse(
            analysis="Dummy analysis",
            timestamp="2024-01-01T00:00:00",
        )


@pytest.fixture
def isolated_storage(tmp_path, monkeypatch) -> JSONStorage:
    """
    Replace global app storage with a temporary JSONStorage per test.
    Keeps tests isolated and deterministic.
    """
    storage = JSONStorage(data_dir=str(tmp_path / "data"))
    monkeypatch.setattr(backend_main, "storage", storage)
    return storage


@pytest.fixture
def client(isolated_storage, monkeypatch):
    """FastAPI test client with isolated storage and stubbed Lyra."""
    monkeypatch.setattr(backend_main, "lyra", DummyLyraClient())
    with TestClient(backend_main.app) as test_client:
        yield test_client
