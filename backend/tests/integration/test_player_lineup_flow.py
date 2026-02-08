import pytest


def _player_payload():
    return {
        "name": "Test Player",
        "number": 12,
        "primary_position": "SS",
        "secondary_positions": ["2B"],
        "bats": "R",
        "throws": "R",
        "notes": "Utility infielder",
    }


def _lineup_with_player(player_id: str):
    lineup = []
    for slot_number in range(1, 10):
        lineup.append(
            {
                "slot_number": slot_number,
                "player_id": player_id if slot_number == 1 else None,
            }
        )
    return lineup


def _field_with_player(player_id: str):
    positions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]
    field_positions = []
    for position in positions:
        field_positions.append(
            {
                "position": position,
                "player_id": player_id if position == "SS" else None,
            }
        )
    return field_positions


@pytest.mark.integration
def test_player_delete_cascades_lineup_and_field_references(client):
    create_response = client.post("/players", json=_player_payload())
    assert create_response.status_code == 201
    player_id = create_response.json()["id"]

    lineup_response = client.put("/lineup", json={"lineup": _lineup_with_player(player_id)})
    assert lineup_response.status_code == 200

    field_response = client.put(
        "/field",
        json={"field_positions": _field_with_player(player_id)},
    )
    assert field_response.status_code == 200

    delete_response = client.delete(f"/players/{player_id}")
    assert delete_response.status_code == 204

    players_response = client.get("/players")
    assert players_response.status_code == 200
    assert players_response.json() == []

    updated_lineup = client.get("/lineup").json()
    assert updated_lineup[0]["player_id"] is None

    updated_field = client.get("/field").json()
    ss_slot = next(p for p in updated_field if p["position"] == "SS")
    assert ss_slot["player_id"] is None


@pytest.mark.integration
def test_lineup_update_rejects_non_nine_slot_payload(client):
    invalid_lineup = [{"slot_number": i, "player_id": None} for i in range(1, 9)]

    response = client.put("/lineup", json={"lineup": invalid_lineup})
    assert response.status_code == 400
    assert "exactly 9 slots" in response.json()["detail"]
