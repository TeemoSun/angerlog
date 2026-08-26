from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AngerLog


def _active(stmt):
    return stmt.where(AngerLog.is_deleted.is_(False))


def _date_range_filter(start_date: date | None, end_date: date | None, tz: str):
    filters = []
    if start_date is not None:
        filters.append(
            AngerLog.created_at
            >= datetime.combine(start_date, datetime.min.time(), tzinfo=ZoneInfo(tz))
        )
    if end_date is not None:
        filters.append(
            AngerLog.created_at
            <= datetime.combine(end_date, datetime.max.time(), tzinfo=ZoneInfo(tz))
        )
    return filters


async def get_summary(
    db: AsyncSession,
    user_id: UUID,
    tz: str,
    start_date: date | None,
    end_date: date | None,
) -> dict:
    filters = [AngerLog.user_id == user_id, AngerLog.is_deleted.is_(False)]
    filters += _date_range_filter(start_date, end_date, tz)

    count_stmt = select(func.count()).select_from(AngerLog).where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    avg_stmt = select(func.avg(AngerLog.intensity)).select_from(AngerLog).where(*filters)
    avg = (await db.execute(avg_stmt)).scalar_one()
    if avg is not None:
        avg = round(float(avg), 2)

    max_stmt = select(func.max(AngerLog.intensity)).select_from(AngerLog).where(*filters)
    max_intensity = (await db.execute(max_stmt)).scalar_one()

    min_stmt = select(func.min(AngerLog.intensity)).select_from(AngerLog).where(*filters)
    min_intensity = (await db.execute(min_stmt)).scalar_one()

    resolved_stmt = (
        select(func.count()).select_from(AngerLog).where(*filters, AngerLog.is_resolved.is_(True))
    )
    resolved = (await db.execute(resolved_stmt)).scalar_one()

    resolve_rate = round(resolved / total, 4) if total else None

    cat_stmt = (
        select(AngerLog.category, func.count())
        .select_from(AngerLog)
        .where(*filters)
        .group_by(AngerLog.category)
    )
    cat_rows = (await db.execute(cat_stmt)).all()
    category_counts = {row[0]: row[1] for row in cat_rows if row[0] is not None}

    return {
        "total_count": total,
        "avg_intensity": avg,
        "max_intensity": max_intensity,
        "min_intensity": min_intensity,
        "resolved_count": resolved,
        "resolve_rate": resolve_rate,
        "category_counts": category_counts,
    }


async def get_trend(
    db: AsyncSession,
    user_id: UUID,
    tz: str,
    granularity: str,
    start_date: date | None,
    end_date: date | None,
) -> list[dict]:
    filters = [AngerLog.user_id == user_id, AngerLog.is_deleted.is_(False)]
    filters += _date_range_filter(start_date, end_date, tz)

    if granularity == "month":
        period_expr = func.to_char(
            func.date_trunc("month", func.timezone(tz, AngerLog.created_at)), "YYYY-MM"
        )
    elif granularity == "week":
        period_expr = func.to_char(
            func.date_trunc("week", func.timezone(tz, AngerLog.created_at)), "YYYY-MM-DD"
        )
    else:
        period_expr = func.to_char(
            func.date_trunc("day", func.timezone(tz, AngerLog.created_at)), "YYYY-MM-DD"
        )

    stmt = (
        select(
            period_expr.label("period"),
            func.count().label("count"),
            func.avg(AngerLog.intensity).label("avg_intensity"),
        )
        .where(*filters)
        .group_by("period")
        .order_by("period")
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "period": row.period,
            "count": row.count,
            "avg_intensity": round(float(row.avg_intensity), 2)
            if row.avg_intensity is not None
            else None,
        }
        for row in rows
    ]


async def get_heatmap(
    db: AsyncSession,
    user_id: UUID,
    tz: str,
    start_date: date | None,
    end_date: date | None,
) -> list[dict]:
    filters = [AngerLog.user_id == user_id, AngerLog.is_deleted.is_(False)]
    filters += _date_range_filter(start_date, end_date, tz)

    stmt = (
        select(
            cast(
                func.extract("ISODOW", func.timezone(tz, AngerLog.created_at)),
                Integer,
            ).label("day_of_week"),
            cast(
                func.extract("HOUR", func.timezone(tz, AngerLog.created_at)),
                Integer,
            ).label("hour_of_day"),
            func.count().label("count"),
        )
        .where(*filters)
        .group_by("day_of_week", "hour_of_day")
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "day_of_week": int(row.day_of_week),
            "hour_of_day": int(row.hour_of_day),
            "count": row.count,
        }
        for row in rows
    ]
