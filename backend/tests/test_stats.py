from datetime import UTC, datetime, timedelta

from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.models import AngerLog


async def _login(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["csrf_token"]


async def _create_log(client, csrf, reason, intensity, category, created_at=None):
    from sqlalchemy import insert

    async with AsyncSessionLocal() as db:
        user_id = (
            await db.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        ).scalar_one()
        stmt = insert(AngerLog).values(
            user_id=user_id,
            trigger_reason=reason,
            intensity=intensity,
            category=category,
            created_at=created_at or datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        await db.execute(stmt)
        await db.commit()


async def test_summary_basic(client):
    csrf = await _login(client)
    await _create_log(client, csrf, "a", 8, "工作")
    await _create_log(client, csrf, "b", 4, "家庭")
    await _create_log(client, csrf, "c", 6, None)

    resp = await client.get("/api/v1/stats/summary")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total_count"] == 3
    assert data["avg_intensity"] == 6.0
    assert data["max_intensity"] == 8
    assert data["min_intensity"] == 4
    assert data["resolved_count"] == 0
    assert data["category_counts"] == {"工作": 1, "家庭": 1}


async def test_summary_excludes_deleted(client):
    csrf = await _login(client)
    log_id = None
    async with AsyncSessionLocal() as db:
        from sqlalchemy import insert

        user_id = (
            await db.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        ).scalar_one()
        stmt = (
            insert(AngerLog)
            .values(
                user_id=user_id,
                trigger_reason="d",
                intensity=9,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .returning(AngerLog.id)
        )
        log_id = (await db.execute(stmt)).scalar_one()
        await db.commit()

    await _create_log(client, csrf, "e", 2, "社交")
    await client.delete(f"/api/v1/logs/{log_id}", headers={"X-CSRF-Token": csrf})

    resp = await client.get("/api/v1/stats/summary")
    data = resp.json()["data"]
    assert data["total_count"] == 1
    assert data["max_intensity"] == 2


async def test_summary_date_range(client):
    csrf = await _login(client)
    base = datetime(2026, 8, 10, 12, 0, tzinfo=UTC)
    await _create_log(client, csrf, "in", 5, "工作", created_at=base)
    await _create_log(client, csrf, "out", 9, "工作", created_at=base + timedelta(days=30))

    resp = await client.get("/api/v1/stats/summary?start_date=2026-08-01&end_date=2026-08-31")
    data = resp.json()["data"]
    assert data["total_count"] == 1
    assert data["max_intensity"] == 5


async def test_trend_day(client):
    csrf = await _login(client)
    base = datetime(2026, 8, 15, 10, 0, tzinfo=UTC)
    await _create_log(client, csrf, "d1", 5, "工作", created_at=base)
    await _create_log(client, csrf, "d2", 7, "工作", created_at=base + timedelta(hours=2))
    await _create_log(client, csrf, "d3", 3, "工作", created_at=base + timedelta(days=1))

    resp = await client.get("/api/v1/stats/trend?granularity=day")
    rows = resp.json()["data"]
    assert len(rows) == 2
    assert rows[0]["count"] == 2
    assert rows[0]["avg_intensity"] == 6.0
    assert rows[1]["count"] == 1


async def test_heatmap_uses_user_timezone(client):
    """UTC 00:30 在 Asia/Shanghai (UTC+8) 下属于 08:30，应计为 hour 8。"""
    csrf = await _login(client)
    utc_0030 = datetime(2026, 8, 21, 0, 30, tzinfo=UTC)
    await _create_log(client, csrf, "tz", 6, "交通", created_at=utc_0030)

    resp = await client.get("/api/v1/stats/heatmap")
    cells = resp.json()["data"]
    assert cells == [{"day_of_week": 5, "hour_of_day": 8, "count": 1}]


async def test_heatmap_iso_weekday(client):
    """2026-08-21 是周五，ISO 语义 day_of_week=5。"""
    csrf = await _login(client)
    await _create_log(
        client,
        csrf,
        "fri",
        6,
        "交通",
        created_at=datetime(2026, 8, 21, 9, 0, tzinfo=UTC),
    )
    resp = await client.get("/api/v1/stats/heatmap")
    cells = resp.json()["data"]
    assert cells[0]["day_of_week"] == 5


async def test_heatmap_excludes_deleted(client):
    csrf = await _login(client)
    async with AsyncSessionLocal() as db:
        from sqlalchemy import insert

        user_id = (
            await db.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        ).scalar_one()
        stmt = insert(AngerLog).values(
            user_id=user_id,
            trigger_reason="del",
            intensity=9,
            is_deleted=True,
            created_at=datetime(2026, 8, 21, 9, 0, tzinfo=UTC),
            updated_at=datetime.now(UTC),
        )
        await db.execute(stmt)
        await db.commit()

    await _create_log(
        client,
        csrf,
        "keep",
        3,
        "其他",
        created_at=datetime(2026, 8, 21, 9, 0, tzinfo=UTC),
    )
    resp = await client.get("/api/v1/stats/heatmap")
    cells = resp.json()["data"]
    assert len(cells) == 1
    assert cells[0]["count"] == 1


async def test_summary_resolve_rate(client):
    csrf = await _login(client)
    await _create_log(client, csrf, "r1", 5, "工作")
    await _create_log(client, csrf, "r2", 5, "工作")
    log_id = (await client.get("/api/v1/logs")).json()["data"][0]["id"]
    await client.put(
        f"/api/v1/logs/{log_id}",
        json={"is_resolved": True, "resolution_method": "m"},
        headers={"X-CSRF-Token": csrf},
    )
    resp = await client.get("/api/v1/stats/summary")
    data = resp.json()["data"]
    assert data["resolved_count"] == 1
    assert data["resolve_rate"] == 0.5


async def test_trend_invalid_granularity(client):
    await _login(client)
    resp = await client.get("/api/v1/stats/trend?granularity=year")
    assert resp.status_code == 400
    assert resp.json()["code"] == 40001
