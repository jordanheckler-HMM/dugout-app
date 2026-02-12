import pytest


def _game_payload():
    return {
        "date": "2025-03-01",
        "opponent": "Riverhawks",
        "home_away": "home",
    }


def _player_payload(name: str = "Schedule Player"):
    return {
        "name": name,
        "number": 11,
        "primary_position": "P",
        "secondary_positions": ["1B"],
        "bats": "R",
        "throws": "R",
    }


@pytest.mark.integration
def test_create_scheduled_game_defaults_to_scheduled_status(client):
    payload = {
        **_game_payload(),
        "source": "schedule",
    }
    response = client.post("/games", json=payload)
    assert response.status_code == 201
    game = response.json()

    assert game["source"] == "schedule"
    assert game["status"] == "scheduled"


@pytest.mark.integration
def test_create_game_infers_completed_status_when_result_present(client):
    payload = {
        **_game_payload(),
        "result": "W",
        "score_us": 6,
        "score_them": 4,
    }
    response = client.post("/games", json=payload)
    assert response.status_code == 201
    game = response.json()

    assert game["status"] == "completed"


@pytest.mark.integration
def test_saving_stats_marks_scheduled_game_completed(client):
    player_resp = client.post("/players", json=_player_payload())
    assert player_resp.status_code == 201
    player_id = player_resp.json()["id"]

    game_resp = client.post("/games", json={**_game_payload(), "source": "schedule"})
    assert game_resp.status_code == 201
    game_id = game_resp.json()["id"]

    stats_payload = {
        "game_id": game_id,
        "stats": [
            {
                "player_id": player_id,
                "ab": 3,
                "h": 1,
            }
        ],
    }
    save_stats_resp = client.post(f"/games/{game_id}/stats", json=stats_payload)
    assert save_stats_resp.status_code == 200

    updated_game_resp = client.get(f"/games/{game_id}")
    assert updated_game_resp.status_code == 200
    assert updated_game_resp.json()["status"] == "completed"


@pytest.mark.integration
def test_manual_extra_game_source_is_preserved(client):
    payload = {
        **_game_payload(),
        "source": "manual",
    }
    response = client.post("/games", json=payload)
    assert response.status_code == 201
    game = response.json()

    assert game["source"] == "manual"
    assert game["status"] == "scheduled"


@pytest.mark.integration
def test_get_games_normalizes_legacy_records(client, isolated_storage):
    legacy_game = {
        "id": "legacy-game-1",
        "date": "2025-03-10",
        "opponent": "Legacy Opponent",
        "home_away": "away",
        "result": "L",
        "score_us": 2,
        "score_them": 5,
        "notes": "legacy record",
        "created_at": "2025-03-01T00:00:00",
    }
    isolated_storage.save("games.json", [legacy_game])

    response = client.get("/games")
    assert response.status_code == 200
    games = response.json()

    assert len(games) == 1
    assert games[0]["source"] == "manual"
    assert games[0]["status"] == "completed"

    persisted = isolated_storage.load("games.json")
    assert persisted[0]["source"] == "manual"
    assert persisted[0]["status"] == "completed"
