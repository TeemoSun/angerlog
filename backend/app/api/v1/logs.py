from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import csrf_protect, get_current_user
from app.models import User
from app.schemas.schemas import LogCreate, LogOut, LogUpdate, PageMeta, envelope
from app.services import log_service

router = APIRouter(prefix="/logs", tags=["logs"])


@router.post("")
async def create_log(
    body: LogCreate,
    db: AsyncSession = Depends(get_db),
    auth: tuple[User, str] = Depends(csrf_protect),
):
    user, _ = auth
    log = await log_service.create_log(db, user.id, body)
    return envelope(LogOut.model_validate(log).model_dump(mode="json"))


@router.get("")
async def list_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    intensity_min: int | None = Query(None, ge=1, le=10),
    intensity_max: int | None = Query(None, ge=1, le=10),
    category: str | None = Query(None),
    resolved: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows, total = await log_service.list_logs(
        db,
        user.id,
        page=page,
        page_size=page_size,
        intensity_min=intensity_min,
        intensity_max=intensity_max,
        category=category,
        resolved=resolved,
    )
    items = [LogOut.model_validate(r).model_dump(mode="json") for r in rows]
    meta = PageMeta(total=total, page=page, page_size=page_size, has_next=page * page_size < total)
    return envelope(items, meta.model_dump())


@router.get("/{log_id}")
async def get_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = await log_service.get_log(db, log_id, user.id)
    return envelope(LogOut.model_validate(log).model_dump(mode="json"))


@router.put("/{log_id}")
async def update_log(
    log_id: UUID,
    body: LogUpdate,
    db: AsyncSession = Depends(get_db),
    auth: tuple[User, str] = Depends(csrf_protect),
):
    user, _ = auth
    log = await log_service.update_log(db, log_id, user.id, body)
    return envelope(LogOut.model_validate(log).model_dump(mode="json"))


@router.delete("/{log_id}")
async def delete_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth: tuple[User, str] = Depends(csrf_protect),
):
    user, _ = auth
    await log_service.soft_delete_log(db, log_id, user.id)
    return envelope(None)
