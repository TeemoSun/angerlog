async def _login(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["csrf_token"]


async def _create_log(client, csrf, reason="堵车", intensity=5, category="交通"):
    resp = await client.post(
        "/api/v1/logs",
        json={
            "trigger_reason": reason,
            "intensity": intensity,
            "category": category,
        },
        headers={"X-CSRF-Token": csrf},
    )
    return resp


async def test_create_log_requires_csrf(client):
    await _login(client)
    resp = await _create_log(client, "")
    assert resp.status_code == 403
    assert resp.json()["code"] == 40301


async def test_create_log_requires_auth(client):
    resp = await client.post(
        "/api/v1/logs",
        json={"trigger_reason": "x", "intensity": 5},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == 40102


async def test_create_log_validation(client):
    csrf = await _login(client)
    resp = await _create_log(client, csrf, intensity=11)
    assert resp.status_code == 400
    assert resp.json()["code"] == 40001

    resp = await _create_log(client, csrf, reason="")
    assert resp.status_code == 400

    resp = await _create_log(client, csrf, category="外星人")
    assert resp.status_code == 400


async def test_create_and_get_log(client):
    csrf = await _login(client)
    resp = await _create_log(client, csrf, reason="同事甩锅", intensity=9, category="工作")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["trigger_reason"] == "同事甩锅"
    assert data["intensity"] == 9
    assert data["category"] == "工作"
    assert data["is_resolved"] is False

    resp = await client.get(f"/api/v1/logs/{data['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == data["id"]


async def test_get_missing_log_returns_404(client):
    await _login(client)
    import uuid

    resp = await client.get(f"/api/v1/logs/{uuid.uuid4()}")
    assert resp.status_code == 404
    assert resp.json()["code"] == 40401


async def test_list_pagination_and_filters(client):
    csrf = await _login(client)
    for i in range(5):
        await _create_log(
            client, csrf, reason=f"r{i}", intensity=i + 1, category="工作" if i % 2 else "家庭"
        )

    resp = await client.get("/api/v1/logs?page=1&page_size=3")
    body = resp.json()
    assert body["meta"]["total"] == 5
    assert len(body["data"]) == 3
    assert body["meta"]["has_next"] is True
    assert body["meta"]["page_size"] == 3

    resp = await client.get("/api/v1/logs?page=2&page_size=3")
    assert resp.json()["meta"]["has_next"] is False

    resp = await client.get("/api/v1/logs?intensity_min=4&intensity_max=5")
    body = resp.json()
    assert body["meta"]["total"] == 2
    assert all(4 <= d["intensity"] <= 5 for d in body["data"])

    resp = await client.get("/api/v1/logs?category=工作")
    assert resp.json()["meta"]["total"] == 2

    resp = await client.get("/api/v1/logs?category=家庭")
    assert resp.json()["meta"]["total"] == 3

    resp = await client.get("/api/v1/logs?category=家庭&intensity_min=1&intensity_max=1")
    body = resp.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["category"] == "家庭"

    resp = await client.get("/api/v1/logs?resolved=true")
    assert resp.json()["meta"]["total"] == 0


async def test_mark_resolved_sets_resolved_at(client):
    csrf = await _login(client)
    log_id = (await _create_log(client, csrf)).json()["data"]["id"]

    resp = await client.put(
        f"/api/v1/logs/{log_id}",
        json={"is_resolved": True, "resolution_method": "散步"},
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_resolved"] is True
    assert data["resolution_method"] == "散步"
    assert data["resolved_at"] is not None
    assert data["updated_at"] >= data["created_at"]

    resp = await client.put(
        f"/api/v1/logs/{log_id}",
        json={"is_resolved": False},
        headers={"X-CSRF-Token": csrf},
    )
    data = resp.json()["data"]
    assert data["is_resolved"] is False
    assert data["resolved_at"] is None
    assert data["resolution_method"] is None


async def test_soft_delete(client):
    csrf = await _login(client)
    log_id = (await _create_log(client, csrf)).json()["data"]["id"]

    resp = await client.delete(f"/api/v1/logs/{log_id}", headers={"X-CSRF-Token": csrf})
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/logs/{log_id}")
    assert resp.status_code == 404

    resp = await client.get("/api/v1/logs")
    assert resp.json()["meta"]["total"] == 0

    # row must still exist physically, flagged deleted
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models import AngerLog

    async with AsyncSessionLocal() as db:
        row = (await db.execute(select(AngerLog).where(AngerLog.id == log_id))).scalar_one()
        assert row.is_deleted is True


async def test_delete_missing_returns_404(client):
    csrf = await _login(client)
    import uuid

    resp = await client.delete(f"/api/v1/logs/{uuid.uuid4()}", headers={"X-CSRF-Token": csrf})
    assert resp.status_code == 404


async def test_update_missing_returns_404(client):
    csrf = await _login(client)
    import uuid

    resp = await client.put(
        f"/api/v1/logs/{uuid.uuid4()}",
        json={"is_resolved": True},
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 404


async def test_create_log_with_custom_created_at(client):
    csrf = await _login(client)
    from datetime import UTC, datetime, timedelta

    when = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    resp = await client.post(
        "/api/v1/logs",
        json={
            "trigger_reason": "昨天的事",
            "intensity": 6,
            "category": "工作",
            "created_at": when,
        },
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    created = data["created_at"]
    # 保留为指定日期（前后误差容忍 5 秒）
    parsed = datetime.fromisoformat(created.replace("Z", "+00:00"))
    assert abs((parsed - datetime.fromisoformat(when.replace("Z", "+00:00"))).total_seconds()) <= 5
    assert data["updated_at"] == created


async def test_create_log_rejects_future_created_at(client):
    csrf = await _login(client)
    from datetime import UTC, datetime, timedelta

    future = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    resp = await _create_log(client, csrf)
    # 带未来时间应被拒绝
    resp = await client.post(
        "/api/v1/logs",
        json={
            "trigger_reason": "未来",
            "intensity": 5,
            "created_at": future,
        },
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == 40001


async def test_create_log_rejects_naive_created_at(client):
    csrf = await _login(client)
    resp = await client.post(
        "/api/v1/logs",
        json={
            "trigger_reason": "无时区",
            "intensity": 5,
            "created_at": "2026-01-01T00:00:00",
        },
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == 40001


async def test_resolve_with_custom_resolved_at(client):
    csrf = await _login(client)
    from datetime import UTC, datetime, timedelta

    log_id = (await _create_log(client, csrf)).json()["data"]["id"]
    when = (datetime.now(UTC) - timedelta(hours=3)).isoformat()

    resp = await client.put(
        f"/api/v1/logs/{log_id}",
        json={"is_resolved": True, "resolution_method": "散步", "resolved_at": when},
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["is_resolved"] is True
    parsed = datetime.fromisoformat(data["resolved_at"].replace("Z", "+00:00"))
    expected = datetime.fromisoformat(when.replace("Z", "+00:00"))
    assert abs((parsed - expected).total_seconds()) <= 5
    assert data["updated_at"] == data["resolved_at"]


async def test_resolve_rejects_future_resolved_at(client):
    csrf = await _login(client)
    from datetime import UTC, datetime, timedelta

    log_id = (await _create_log(client, csrf)).json()["data"]["id"]
    future = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    resp = await client.put(
        f"/api/v1/logs/{log_id}",
        json={"is_resolved": True, "resolution_method": "x", "resolved_at": future},
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == 40001
