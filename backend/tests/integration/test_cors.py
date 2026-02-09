import pytest


@pytest.mark.integration
@pytest.mark.parametrize(
    "origin",
    [
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
)
def test_cors_allows_tauri_origins(client, origin):
    response = client.options(
        "/players",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
