from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas.schemas import HeatmapCell, SummaryOut, TrendPoint, envelope
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary")
async def get_summary(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await stats_service.get_summary(db, user.id, user.timezone, start_date, end_date)
    return envelope(SummaryOut(**data).model_dump())


@router.get("/trend")
async def get_trend(
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await stats_service.get_trend(
        db, user.id, user.timezone, granularity, start_date, end_date
    )
    return envelope([TrendPoint(**p).model_dump() for p in data])


@router.get("/heatmap")
async def get_heatmap(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await stats_service.get_heatmap(db, user.id, user.timezone, start_date, end_date)
    return envelope([HeatmapCell(**c).model_dump() for c in data])
