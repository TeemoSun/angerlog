# AGENTS.md

情绪瓶（angerlog）：把生气记录抽象为投入瓶中的小球，帮助觉察情绪规律。React 前端 + FastAPI 后端 + PostgreSQL，Docker 分发。

> 仓库当前**尚无业务代码**（仅有 `docs/`、`Dockerfile`、`scripts/`、`README.md`）。`docs/设计文档.md` 是设计决策的唯一权威来源；下方约定据此与已存在的 `Dockerfile` 提炼，写代码时必须遵守。

## 目录结构（待建，非 monorepo workspace）

- `backend/` — Python **3.12** + FastAPI + SQLAlchemy 2.0(异步) + Alembic，用 **uv**（不是 pip）。`backend/app/` 为应用，`backend/migrations/` 为 Alembic 迁移，`backend/tests/` 为 pytest。命令一律 `cd backend && uv run ...`。> 注：设计文档写的是 3.11，但根 `Dockerfile` 用 `python:3.12-slim`，以 Dockerfile 为准。
- `frontend/` — React 18 + TS + Vite + shadcn/ui + Tailwind。构建 `tsc -b && vite build`，产物 `frontend/dist/` 由后端生产环境静态托管。
- 后端开发与前端开发分开跑；`docker compose up -d` 跑全栈（postgres + backend）。

## Docker 打包上传（已落地，必读）

详见 `docs/Docker镜像打包上传.md`，一键脚本 `scripts/docker-push.sh`。要点：

- 根目录多阶段 `Dockerfile`：Stage1 `node:20-bookworm-slim` 跑 `npm ci`(回退 `npm install`)+`npm run build`；Stage2 `python:3.12-slim` + `uv`（来自 `ghcr.io/astral-sh/uv:latest`），`uv sync --frozen --no-dev`，拷入后端代码与前端 `dist`，`uvicorn` 启动，内置 `HEALTHCHECK` 探 `/health`。
- **tag 规范**：同时打 `pigzho/angerlog:latest` 与 `pigzho/angerlog:<YYYYMMDD>`（当日日期）。Docker Hub 用户名固定 `pigzho`。**不要用 git commit hash 做 tag**。
- 流程：`docker build` → `docker login`(已登录可跳过) → `docker push` 两个 tag。一键：`DOCKER_USER=pigzho bash scripts/docker-push.sh`。
- 删除远程 tag 需走 Docker Hub API（JWT），见文档；本地 `docker rmi`。
- `uv.lock` 与 `package-lock.json` 必须与依赖同步，否则 Docker `--frozen` / `npm ci` 构建失败。

## 关键架构约定（写代码时易踩坑）

- **无 RSA、无应用层密码加密**：登录密码依赖上层代理的 TLS，后端收明文与 bcrypt 哈希比对。**不要再加 RSA/crypto-js/`/auth/public-key`/`certs/`**（曾评审后移除）。
- **无 Nginx、无 HTTPS 证书**：本项目只提供 HTTP，TLS 由上层反向代理负责。compose 里**不要**加 nginx 服务。
- **认证用双 Token + HttpOnly Cookie，不是 localStorage JWT**：access 15 分钟、refresh 30 天，均置 HttpOnly Cookie（`Secure + SameSite`）；refresh 仅存哈希于 `refresh_tokens` 表，支持轮换与吊销。写操作必须带 `X-CSRF-Token` 头，后端校验。Axios 配 `withCredentials: true`。
- **数据库时区**：`TIMESTAMPTZ` 一律存 UTC；星期/小时统计在查询时按 `users.timezone` 用 `EXTRACT(ISODOW/HOUR FROM created_at AT TIME ZONE :tz)` 动态计算。**不要用生成列**（`day_of_week`/`hour_of_day` 已从设计移除）。星期用 ISO 语义（周一=1…周日=7）。
- **软删除**：`anger_logs.is_deleted`，所有列表/统计查询默认带 `is_deleted = FALSE`（统计排除已删除）。`DELETE /logs/{id}` 只置 true。
- **category 是枚举**：DB 层 `CHECK (category IN ('工作','家庭','交通','社交','其他') OR category IS NULL)`，不要存自由文本。
- **账号初始化**：应用启动时按环境变量 `USERNAME`/`PASSWORD_HASH` 对 `users` 表 upsert（幂等），无注册功能。bcrypt cost=12。
- **健康检查路径是 `/health`**（不是 `/api/health`）。Dockerfile HEALTHCHECK 与上层探活都用它。
- **迁移由 `app.main` lifespan 启动时自动执行**（Dockerfile 不单独跑迁移）；`users` upsert 也在启动事件完成。必需环境变量缺失时启动直接失败退出（Pydantic Settings 校验）。
- **审计字段**：`anger_logs.updated_at` 与 `resolved_at` 分开；标记解决时同时更新 `updated_at`。

## 环境变量（`.env`，启动校验必需项）

`DATABASE_URL`、`USERNAME`、`PASSWORD_HASH`、`USER_TIMEZONE`、`SECRET_KEY`、`CSRF_SECRET`、`ACCESS_TOKEN_EXPIRE_MINUTES`、`REFRESH_TOKEN_EXPIRE_DAYS`、`LOGIN_RATE_LIMIT`、`CORS_ORIGINS`。完整见设计文档 5.2。空占位值须启动失败。

## 测试（待建）

- 后端：pytest + httpx AsyncClient，重点覆盖双 token/刷新/登出、软删除过滤、统计按时区计算、速率限制、CSRF。测试用独立 PG 实例或事务回滚隔离。
- 前端：Vitest + React Testing Library，覆盖表单校验、呼吸引导(强度≥8触发)、水位联动、筛选。
- 无 E2E、无覆盖率门槛（当前未纳入）。