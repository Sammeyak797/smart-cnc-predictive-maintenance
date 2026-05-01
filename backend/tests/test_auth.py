def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "test@gmail.com",
        "password": "123456"
    })

    assert res.status_code == 200
    data = res.get_json()

    assert "token" in data


def test_login_invalid_user(client):
    res = client.post("/api/auth/login", json={
        "email": "wrong@gmail.com",
        "password": "123456"
    })

    assert res.status_code == 404 or res.status_code == 401