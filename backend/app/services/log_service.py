from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.repositories import log_repository
from app.schemas.schemas import LogCreate, LogUpdate


async def create_log(db: AsyncSession, user_id: UUID, data: LogCreate):
    return await log_repository.create_log(db, user_id, data)


async def get_log(db: AsyncSession, log_id: UUID, user_id: UUID):
    log = await log_repository.get_log(db, log_id, user_id)
    if log is None:
        raise errors.E_NOT_FOUND
    return log


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
):
    return await log_repository.list_logs(
        db,
        user_id,
        page=page,
        page_size=page_size,
        intensity_min=intensity_min,
        intensity_max=intensity_max,
        category=category,
        resolved=resolved,
    )


async def update_log(db: AsyncSession, log_id: UUID, user_id: UUID, data: LogUpdate):
    log = await log_repository.get_log(db, log_id, user_id)
    if log is None:
        raise errors.E_NOT_FOUND
    return await log_repository.update_log(db, log, data)


async def soft_delete_log(db: AsyncSession, log_id: UUID, user_id: UUID) -> None:
    deleted = await log_repository.soft_delete_log(db, log_id, user_id)
    if not deleted:
        raise errors.E_NOT_FOUND
