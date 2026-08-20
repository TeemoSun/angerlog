import time
from collections import defaultdict, deque
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_token, verify_csrf_token
from app.models import User

settings = get_settings()


class LoginRateLimiter:
    """Sliding-window rate limiter keyed by client IP, stored in memory."""

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        dq = self._attempts[key]
        while dq and now - dq[0] > self.window_seconds:
            dq.popleft()
        if len(dq) >= self.limit:
            raise errors.E_RATE_LIMIT
        dq.append(now)

    def reset(self, key: str) -> None:
        self._attempts.pop(key, None)


login_limiter = LoginRateLimiter(*settings.rate_limit_tuple)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def get_access_token_from_request(request: Request) -> str:
    return request.cookies.get("access_token") or ""


async def get_current_user_payload(
    request: Request, db: AsyncSession = Depends(get_db)
) -> tuple[User, str]:
    token = get_access_token_from_request(request)
    if not token:
        raise errors.E_ACCESS_EXPIRED
    try:
        payload = decode_token(token)
    except Exception:
        raise errors.E_ACCESS_EXPIRED from None
    if payload.get("type") != "access":
        raise errors.E_ACCESS_EXPIRED
    user_id = payload.get("sub")
    if not user_id:
        raise errors.E_ACCESS_EXPIRED
    user = await db.get(User, UUID(user_id))
    if user is None:
        raise errors.E_ACCESS_EXPIRED
    return user, token


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    user, _ = await get_current_user_payload(request, db)
    return user


async def csrf_protect(request: Request, db: AsyncSession = Depends(get_db)) -> tuple[User, str]:
    user, token = await get_current_user_payload(request, db)
    provided = request.headers.get("X-CSRF-Token", "")
    if not verify_csrf_token(token, provided):
        raise errors.E_CSRF
    return user, token
