import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings

settings = get_settings()

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def _now_utc() -> datetime:
    return datetime.now(UTC)


def create_access_token(user_id: uuid.UUID) -> str:
    payload = {
        "sub": str(user_id),
        "type": ACCESS_TOKEN_TYPE,
        "iat": _now_utc(),
        "exp": _now_utc() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_refresh_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


def _csrf_payload(access_token: str) -> bytes:
    return f"csrf:{access_token}".encode()


def issue_csrf_token(access_token: str) -> str:
    return hmac.new(
        settings.CSRF_SECRET.encode(), _csrf_payload(access_token), hashlib.sha256
    ).hexdigest()


def verify_csrf_token(access_token: str, provided: str) -> bool:
    if not provided:
        return False
    expected = issue_csrf_token(access_token)
    return hmac.compare_digest(expected, provided)
