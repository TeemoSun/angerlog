# ===== Stage 1: 前端构建 =====
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: 后端运行 =====
FROM python:3.12-slim AS runtime
# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PYTHONUNBUFFERED=1

ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app/backend
# 先拷依赖描述以便利用缓存
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --frozen --no-dev

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

# alembic 迁移由 main.py lifespan 自动执行，无需在此重复
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]