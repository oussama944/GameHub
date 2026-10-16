def test_health_returns_200(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert "ollama_reachable" in body
    assert "loaded_models" in body
    assert "version" in body