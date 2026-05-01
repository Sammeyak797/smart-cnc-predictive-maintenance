def test_protected_route_requires_token(client):
    res = client.get("/api/alerts/")
    assert res.status_code == 401