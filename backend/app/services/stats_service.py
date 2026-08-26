from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import stats_repository


async def get_summary(
    db: AsyncSession,
    user_id: UUID,
    tz: str,
    start_date: date | None,
    end_date: date | None,
) -> dict:
    return await stats_repository.get_summary(db, user_id, tz, start_date, end_date)


async def get_trend(
    db: AsyncSession,
    user_id: UUID,
    tz: str,
    granularity: str,
    start_date: date | None,
    end_date: date | None,
) -> list[dict]:
    return await stats_repository.get_trend(db, user_id, tz, granularity, start_date, end_date)


async def get_heatmap(
    db: AsyncSession,
    user_id: UUID,
    tz: str,
    start_date: date | None,
    end_date: date | None,
) -> list[dict]:
    return await stats_repository.get_heatmap(db, user_id, tz, start_date, end_date)
