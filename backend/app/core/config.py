import re
from functools import lru_cache
from pathlib import Path

import bcrypt
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_RATE_LIMIT_RE = re.compile(r"^(\d+)/(\d+)(minute|minutes|second|seconds|hour|hours)$")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    DATABASE_URL: str
    USERNAME: str
    PASSWORD: str
    USER_TIMEZONE: str = "Asia/Shanghai"
    SECRET_KEY: str
    CSRF_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    LOGIN_RATE_LIMIT: str = "5/5minutes"
    CORS_ORIGINS: str = "http://localhost:5173"
    FRONTEND_DIST: str = "/app/frontend/dist"

    @field_validator("LOGIN_RATE_LIMIT")
    @classmethod
    def validate_rate_limit(cls, v: str) -> str:
        if not _RATE_LIMIT_RE.match(v):
            raise ValueError('LOGIN_RATE_LIMIT must be in "N/5minutes" format, e.g. "5/5minutes"')
        return v

    @property
    def password_hash(self) -> str:
        return bcrypt.hashpw(self.PASSWORD.encode(), bcrypt.gensalt(12)).decode()

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def rate_limit_tuple(self) -> tuple[int, int]:
        m = _RATE_LIMIT_RE.match(self.LOGIN_RATE_LIMIT)
        assert m is not None
        limit = int(m.group(1))
        unit = m.group(3)
        multiplier = 1 if unit.startswith("second") else (3600 if unit.startswith("hour") else 60)
        return limit, int(m.group(2)) * multiplier


@lru_cache
def get_settings() -> Settings:
    return Settings()
