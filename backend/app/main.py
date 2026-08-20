import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1 import auth, logs, stats
from app.core import errors
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.response import error_response as api_error_response
from app.core.response import fail
from app.repositories import auth_repository

logger = logging.getLogger("angerlog")
settings = get_settings()

BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BACKEND_DIR / "migrations"


async def run_migrations() -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(MIGRATIONS_DIR))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    await asyncio.to_thread(command.upgrade, cfg, "head")


async def upsert_default_user() -> None:
    async with AsyncSessionLocal() as db:
        await auth_repository.upsert_user(
            db, settings.USERNAME, settings.password_hash, settings.USER_TIMEZONE
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Running database migrations...")
    await run_migrations()
    logger.info("Migrations complete. Upserting default user...")
    await upsert_default_user()
    logger.info("Startup complete")
    yield


app = FastAPI(title="Angerlog API", lifespan=lifespan, docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(logs.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")


@app.get("/health")
async def health():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.exception_handler(errors.ApiError)
async def api_error_handler(request: Request, exc: errors.ApiError):
    return api_error_response(exc)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content=fail(40001, "invalid parameters"))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error")
    return JSONResponse(status_code=500, content=fail(50000, "internal server error"))


frontend_dist = Path(settings.FRONTEND_DIST)
if frontend_dist.is_dir():
    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    class SpaStaticFiles(StaticFiles):
        async def get_response(self, path: str, scope):
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                return FileResponse(frontend_dist / "index.html")
            return response

    app.mount("/", SpaStaticFiles(directory=str(frontend_dist), html=True), name="frontend")
