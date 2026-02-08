import pytest


def _player_payload(name: str = "Season Player"):
    return {
        "name": name,
        "number": 8,
        "primary_position": "P",
        "secondary_positions": ["1B"],
        "bats": "R",
        "throws": "R",
    }


def _game_payload():
    return {
        "date": "2025-03-01",
        "opponent": "Riverhawks",
        "home_away": "home",
    }


@pytest.mark.integration
def test_game_stats_roll_up_into_season_stats(client):
    player_resp = client.post("/players", json=_player_payload())
    assert player_resp.status_code == 201
    player_id = player_resp.json()["id"]

    game_resp = client.post("/games", json=_game_payload())
    assert game_resp.status_code == 201
    game_id = game_resp.json()["id"]

    stats_payload = {
        "game_id": game_id,
        "stats": [
            {
                "player_id": player_id,
                "ab": 4,
                "h": 2,
                "doubles": 1,
                "bb": 1,
                "rbi": 2,
                "ip": 1.2,
                "h_allowed": 3,
                "bb_allowed": 1,
                "er": 2,
                "k": 2,
            }
        ],
    }
    save_stats_resp = client.post(f"/games/{game_id}/stats", json=stats_payload)
    assert save_stats_resp.status_code == 200

    season_resp = client.get(f"/players/{player_id}/stats/season")
    assert season_resp.status_code == 200
    season = season_resp.json()

    assert season["games_played"] == 1
    assert season["hitting"]["avg"] == 0.5
    assert season["hitting"]["obp"] == 0.6
    assert season["hitting"]["slg"] == 0.75
    assert season["hitting"]["ops"] == 1.35
    assert season["pitching"]["era"] == 10.8
    assert season["pitching"]["whip"] == 2.4


@pytest.mark.integration
def test_bulk_game_stats_rejects_unknown_player(client):
    game_resp = client.post("/games", json=_game_payload())
    assert game_resp.status_code == 201
    game_id = game_resp.json()["id"]

    stats_payload = {
        "game_id": game_id,
        "stats": [
            {
                "player_id": "missing-player-id",
                "ab": 1,
            }
        ],
    }

    response = client.post(f"/games/{game_id}/stats", json=stats_payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
