async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_login_success_sets_cookies(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["username"] == "admin"
    assert "csrf_token" in body["data"]
    cookies = resp.cookies
    assert "access_token" in cookies
    assert "refresh_token" in cookies


async def test_login_wrong_password(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrongpass"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == 40101


async def test_health_requires_no_auth(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
