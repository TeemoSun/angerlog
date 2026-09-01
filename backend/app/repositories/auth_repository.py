from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RefreshToken, User


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    stmt = select(User).where(User.username == username)
    return (await db.execute(stmt)).scalar_one_or_none()


async def upsert_user(
    db: AsyncSession,
    username: str,
    password_hash: str,
    timezone: str,
    bottle_style: str = "C",
) -> User:
    user = await get_user_by_username(db, username)
    if user is None:
        user = User(
            username=username,
            password_hash=password_hash,
            timezone=timezone,
            bottle_style=bottle_style,
        )
        db.add(user)
    else:
        if user.password_hash != password_hash or user.timezone != timezone:
            user.password_hash = password_hash
            user.timezone = timezone
            user.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_bottle_style(
    db: AsyncSession,
    user_id: UUID,
    bottle_style: str,
) -> User | None:
    user = await db.get(User, user_id)
    if user is None:
        return None
    user.bottle_style = bottle_style
    user.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return user


async def get_refresh_token(db: AsyncSession, token_hash: str) -> RefreshToken | None:
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_refresh_token(
    db: AsyncSession, user_id: UUID, token_hash: str, expires_at: datetime
) -> RefreshToken:
    rt = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(rt)
    await db.commit()
    await db.refresh(rt)
    return rt


async def revoke_refresh_token(db: AsyncSession, token_hash: str) -> None:
    rt = await get_refresh_token(db, token_hash)
    if rt is not None:
        rt.revoked = True
        await db.commit()


async def revoke_all_for_user(db: AsyncSession, user_id: UUID) -> None:
    stmt = delete(RefreshToken).where(RefreshToken.user_id == user_id)
    await db.execute(stmt)
    await db.commit()


async def purge_expired_refresh_tokens(db: AsyncSession) -> None:
    stmt = delete(RefreshToken).where(RefreshToken.expires_at < datetime.now(UTC))
    await db.execute(stmt)
    await db.commit()


async def count_active_refresh_tokens(db: AsyncSession, user_id: UUID) -> int:
    stmt = (
        select(func.count())
        .select_from(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.now(UTC),
        )
    )
    return (await db.execute(stmt)).scalar_one()
