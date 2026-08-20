from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors, security
from app.core.config import get_settings
from app.models import User
from app.repositories import auth_repository

settings = get_settings()

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def _now() -> datetime:
    return datetime.now(UTC)


def build_cookie_params(token: str, max_age: int) -> dict:
    return {
        "value": token,
        "max_age": max_age,
        "httponly": True,
        "samesite": "lax",
        "secure": False,
        "path": "/",
    }


async def authenticate(db: AsyncSession, username: str, password: str) -> User:
    user = await auth_repository.get_user_by_username(db, username)
    if user is None or not security.verify_password(password, user.password_hash):
        raise errors.E_UNAUTHORIZED
    return user


async def issue_refresh_token(db: AsyncSession, user_id: UUID) -> str:
    raw = security.generate_refresh_token()
    expires = _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await auth_repository.create_refresh_token(
        db, user_id, security.hash_refresh_token(raw), expires
    )
    return raw


async def rotate_refresh_token(db: AsyncSession, old_raw: str, user_id: UUID) -> str:
    token_hash = security.hash_refresh_token(old_raw)
    stored = await auth_repository.get_refresh_token(db, token_hash)
    if stored is None or stored.revoked or stored.expires_at < _now() or stored.user_id != user_id:
        raise errors.E_REFRESH_EXPIRED
    stored.revoked = True
    raw = security.generate_refresh_token()
    expires = _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await auth_repository.create_refresh_token(
        db, user_id, security.hash_refresh_token(raw), expires
    )
    return raw


async def logout(db: AsyncSession, raw_token: str) -> None:
    if raw_token:
        await auth_repository.revoke_refresh_token(db, security.hash_refresh_token(raw_token))
