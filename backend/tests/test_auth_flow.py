async def _login(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp


async def test_refresh_rotates_token(client):
    resp = await _login(client)
    old_refresh = resp.cookies.get("refresh_token")
    r1 = await client.post("/api/v1/auth/refresh")
    assert r1.status_code == 200
    new_refresh = r1.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    # replaying the OLD refresh token must be rejected (rotation revokes it)
    r2 = await client.post("/api/v1/auth/refresh", cookies={"refresh_token": old_refresh})
    assert r2.status_code == 401
    assert r2.json()["code"] == 40103

    # the new refresh token still works
    r3 = await client.post("/api/v1/auth/refresh", cookies={"refresh_token": new_refresh})
    assert r3.status_code == 200


async def test_refresh_without_cookie(client):
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401
    assert resp.json()["code"] == 40103


async def test_logout_revokes_refresh(client):
    await _login(client)
    resp = await client.post("/api/v1/auth/logout")
    assert resp.status_code == 200

    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401
    assert refresh.json()["code"] == 40103


async def test_access_protected_route_after_logout(client):
    await _login(client)
    await client.post("/api/v1/auth/logout")
    resp = await client.get("/api/v1/logs")
    assert resp.status_code == 401
    assert resp.json()["code"] == 40102


async def test_login_rate_limit(client):
    for _ in range(5):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert resp.status_code == 401, resp.text
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert resp.status_code == 429
    assert resp.json()["code"] == 42901

    # successful login also blocked when over limit
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 429


async def test_rate_limit_resets_after_success(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200


async def test_bottle_style_flow(client):
    resp = await _login(client)
    body = resp.json()["data"]
    assert body["bottle_style"] == "C"
    csrf = body["csrf_token"]

    # update to A
    r_update = await client.put(
        "/api/v1/auth/bottle-style",
        json={"bottle_style": "A"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r_update.status_code == 200
    assert r_update.json()["data"]["bottle_style"] == "A"

    # get /me
    r_me = await client.get("/api/v1/auth/me")
    assert r_me.status_code == 200
    assert r_me.json()["data"]["bottle_style"] == "A"

    # refresh token returns updated bottle_style
    r_refresh = await client.post("/api/v1/auth/refresh")
    assert r_refresh.status_code == 200
    assert r_refresh.json()["data"]["bottle_style"] == "A"
    csrf = r_refresh.json()["data"]["csrf_token"]

    # invalid bottle style should be rejected
    r_invalid = await client.put(
        "/api/v1/auth/bottle-style",
        json={"bottle_style": "Z_INVALID"},
        headers={"X-CSRF-Token": csrf},
    )
    assert r_invalid.status_code == 400
