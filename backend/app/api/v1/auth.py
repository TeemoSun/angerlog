from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors, security
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import client_ip, login_limiter
from app.models import User
from app.repositories import auth_repository
from app.schemas.schemas import LoginRequest, envelope
from app.services import auth_service

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
REFRESH_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=auth_service.ACCESS_COOKIE,
        value=token,
        max_age=ACCESS_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=auth_service.REFRESH_COOKIE,
        value=token,
        max_age=REFRESH_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(auth_service.ACCESS_COOKIE, path="/")
    response.delete_cookie(auth_service.REFRESH_COOKIE, path="/")


@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    key = client_ip(request)
    login_limiter.check(key)
    user = await auth_service.authenticate(db, body.username, body.password)
    login_limiter.reset(key)

    access_token = security.create_access_token(user.id)
    refresh_raw = await auth_service.issue_refresh_token(db, user.id)
    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, refresh_raw)
    csrf_token = security.issue_csrf_token(access_token)
    return envelope({"csrf_token": csrf_token, "username": user.username})


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    raw = request.cookies.get(auth_service.REFRESH_COOKIE)
    if not raw:
        raise errors.E_REFRESH_EXPIRED
    token_hash = security.hash_refresh_token(raw)
    stored = await auth_repository.get_refresh_token(db, token_hash)
    if stored is None:
        raise errors.E_REFRESH_EXPIRED
    new_raw = await auth_service.rotate_refresh_token(db, raw, stored.user_id)
    user = await db.get(User, stored.user_id)
    if user is None:
        raise errors.E_REFRESH_EXPIRED
    access_token = security.create_access_token(user.id)
    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, new_raw)
    return envelope({"csrf_token": security.issue_csrf_token(access_token)})


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    raw = request.cookies.get(auth_service.REFRESH_COOKIE) or ""
    await auth_service.logout(db, raw)
    _clear_auth_cookies(response)
    return envelope(None)
