from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AngerLog
from app.schemas.schemas import LogCreate, LogUpdate


def _active(stmt):
    return stmt.where(AngerLog.is_deleted.is_(False))


async def create_log(db: AsyncSession, user_id: UUID, data: LogCreate) -> AngerLog:
    log = AngerLog(
        user_id=user_id,
        trigger_reason=data.trigger_reason,
        intensity=data.intensity,
        category=data.category,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def get_log(db: AsyncSession, log_id: UUID, user_id: UUID) -> AngerLog | None:
    stmt = select(AngerLog).where(
        AngerLog.id == log_id, AngerLog.user_id == user_id, AngerLog.is_deleted.is_(False)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_logs(
    db: AsyncSession,
    user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    intensity_min: int | None = None,
    intensity_max: int | None = None,
    category: str | None = None,
    resolved: bool | None = None,
) -> tuple[list[AngerLog], int]:
    filters = [AngerLog.user_id == user_id, AngerLog.is_deleted.is_(False)]
    if intensity_min is not None:
        filters.append(AngerLog.intensity >= intensity_min)
    if intensity_max is not None:
        filters.append(AngerLog.intensity <= intensity_max)
    if category is not None:
        filters.append(AngerLog.category == category)
    if resolved is not None:
        filters.append(AngerLog.is_resolved == resolved)

    total_stmt = select(func.count()).select_from(AngerLog).where(*filters)
    total = (await db.execute(total_stmt)).scalar_one()

    stmt = (
        select(AngerLog)
        .where(*filters)
        .order_by(AngerLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total


async def update_log(db: AsyncSession, log: AngerLog, data: LogUpdate) -> AngerLog:
    now = datetime.now()
    if data.is_resolved and not log.is_resolved:
        log.is_resolved = True
        log.resolved_at = now
        log.resolution_method = data.resolution_method
    elif not data.is_resolved:
        log.is_resolved = False
        log.resolved_at = None
        log.resolution_method = None
    log.updated_at = now
    await db.commit()
    await db.refresh(log)
    return log


async def soft_delete_log(db: AsyncSession, log_id: UUID, user_id: UUID) -> bool:
    stmt = select(AngerLog).where(
        AngerLog.id == log_id,
        AngerLog.user_id == user_id,
        AngerLog.is_deleted.is_(False),
    )
    log = (await db.execute(stmt)).scalar_one_or_none()
    if log is None:
        return False
    log.is_deleted = True
    log.updated_at = datetime.now()
    await db.commit()
    return True
