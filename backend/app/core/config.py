import re
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_RATE_LIMIT_RE = re.compile(r"^(\d+)/(\d+)(minute|minutes|second|seconds|hour|hours)$")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    USERNAME: str
    PASSWORD_HASH: str
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

    @field_validator("PASSWORD_HASH")
    @classmethod
    def validate_password_hash(cls, v: str) -> str:
        if not (v.startswith("$2a$") or v.startswith("$2b$") or v.startswith("$2y$")):
            raise ValueError("PASSWORD_HASH must be a valid bcrypt hash starting with $2")
        return v

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
