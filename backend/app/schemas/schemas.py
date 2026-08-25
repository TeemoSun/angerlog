from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.entities import CATEGORIES


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class LogCreate(BaseModel):
    trigger_reason: str = Field(min_length=1, max_length=500)
    intensity: int = Field(ge=1, le=10)
    category: str | None = Field(default=None, max_length=20)
    created_at: datetime | None = None

    @field_validator("trigger_reason")
    @classmethod
    def strip_reason(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("trigger_reason must not be empty")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is not None and v not in CATEGORIES:
            raise ValueError(f"category must be one of {list(CATEGORIES)}")
        return v

    @field_validator("created_at")
    @classmethod
    def normalize_created_at(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.tzinfo is None:
            raise ValueError("created_at must be timezone-aware")
        if v > datetime.now(UTC) + timedelta(seconds=10):
            raise ValueError("created_at must not be in the future")
        return v.astimezone(UTC)


class LogUpdate(BaseModel):
    is_resolved: bool = False
    resolution_method: str | None = Field(default=None, max_length=500)
    resolved_at: datetime | None = None

    @field_validator("resolution_method")
    @classmethod
    def strip_method(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        return v or None

    @field_validator("resolved_at")
    @classmethod
    def normalize_resolved_at(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.tzinfo is None:
            raise ValueError("resolved_at must be timezone-aware")
        if v > datetime.now(UTC) + timedelta(seconds=10):
            raise ValueError("resolved_at must not be in the future")
        return v.astimezone(UTC)


class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trigger_reason: str
    intensity: int
    category: str | None
    is_resolved: bool
    resolution_method: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class PageMeta(BaseModel):
    total: int
    page: int
    page_size: int
    has_next: bool


class SummaryOut(BaseModel):
    total_count: int
    avg_intensity: float | None
    max_intensity: int | None
    min_intensity: int | None
    resolved_count: int
    resolve_rate: float | None
    category_counts: dict[str, int]


class TrendPoint(BaseModel):
    period: str
    count: int
    avg_intensity: float | None


class HeatmapCell(BaseModel):
    day_of_week: int
    hour_of_day: int
    count: int


def envelope(data: Any = None, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": 0, "message": "success", "data": data}
    if meta is not None:
        payload["meta"] = meta
    return payload
