# ===== Stage 1: 前端构建 =====
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: 后端依赖（uv 仅在此阶段使用，不进运行时镜像）=====
# 用 alpine 装依赖 + 运行时，全程 glibc-free，体积最小（~157MB）
FROM python:3.12-alpine AS backend-deps
# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_CACHE_DIR=/tmp/uv-cache \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --frozen --no-dev && rm -rf /tmp/uv-cache

# ===== Stage 3: 运行时 =====
FROM python:3.12-alpine AS runtime
# 后端基础镜像切到 alpine 后，uvicorn 将使用纯 asyncio 事件循环：
# uvloop/httptools 只在 glibc 下有 wheel，musl 下 uv sync 自动跳过它们
# （uv.lock 的 sys_platform 条件项，非配置缺失，行为与本地 dev 不同属预期）
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
COPY --from=backend-deps /opt/venv /opt/venv
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

# alembic 迁移由 main.py lifespan 自动执行，无需在此重复
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
