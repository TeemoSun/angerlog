import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

TEST_DB_PORT = os.environ.get("TEST_DB_PORT", "54329")
os.environ["DATABASE_URL"] = (
    f"postgresql+asyncpg://app_user:testpass@localhost:{TEST_DB_PORT}/emotion_bottle_test"
)
os.environ["USERNAME"] = "admin"
os.environ["PASSWORD"] = "testpass123"
os.environ["USER_TIMEZONE"] = "Asia/Shanghai"
os.environ["SECRET_KEY"] = "test-secret-key-0123456789abcdef0123456789abcdef"
os.environ["CSRF_SECRET"] = "test-csrf-secret-0123456789abcdef0123456789abcdef"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "15"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "30"
os.environ["LOGIN_RATE_LIMIT"] = "5/5minutes"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["FRONTEND_DIST"] = "/nonexistent/dist"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.database import AsyncSessionLocal, Base
from app.main import app

TEST_DB_URL = os.environ["DATABASE_URL"]


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    test_engine = create_async_engine(TEST_DB_URL)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await test_engine.dispose()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_db():
    from app.core.dependencies import login_limiter

    login_limiter._attempts.clear()
    yield
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("TRUNCATE anger_logs, refresh_tokens, users RESTART IDENTITY CASCADE")
        )
        await db.commit()


@pytest_asyncio.fixture(autouse=True)
async def seed_user():
    from app.core.config import get_settings
    from app.repositories import auth_repository

    settings = get_settings()
    async with AsyncSessionLocal() as db:
        await auth_repository.upsert_user(
            db, settings.USERNAME, settings.password_hash, settings.USER_TIMEZONE
        )


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    return client
