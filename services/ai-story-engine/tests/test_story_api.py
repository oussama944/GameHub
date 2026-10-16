from unittest.mock import AsyncMock, patch


def test_story_requires_auth(client):
    r = client.post("/story/generate", json={"prompt": "test"})
    assert r.status_code == 401


def test_story_light(client, auth_headers):
    fake = {"response": "Il était une fois un elfe…", "eval_count": 42}
    with patch(
        "app.services.ollama_client.ollama_client.generate",
        new=AsyncMock(return_value=fake),
    ):
        r = client.post(
            "/story/generate",
            json={"prompt": "Un elfe entre dans la forêt."},
            headers=auth_headers,
        )
    assert r.status_code == 200
    body = r.json()
    assert body["decision"]["tier"] == "light"
    assert body["decision"]["model"].startswith("qwen")
    assert "latency_ms" in body["meta"]


def test_story_heavy(client, auth_headers):
    fake = {"response": "Le chapitre final commence…", "eval_count": 180}
    with patch(
        "app.services.ollama_client.ollama_client.generate",
        new=AsyncMock(return_value=fake),
    ):
        r = client.post(
            "/story/generate",
            json={"prompt": "Écris le chapitre final avec un twist dramatique."},
            headers=auth_headers,
        )
    assert r.status_code == 200
    body = r.json()
    assert body["decision"]["tier"] == "heavy"
    assert body["decision"]["model"].startswith("llama")