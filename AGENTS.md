# AGENTS.md

情绪瓶（angerlog）：把生气记录抽象为投入瓶中的小球，帮助觉察情绪规律。React 18 前端 + FastAPI 后端 + PostgreSQL，Docker 分发。设计决策以 `docs/设计文档.md` 为准，前端视觉风格以 `docs/美术风格指南.md` 为准，但**实现细节以代码为准**（README 仍写 Python 3.11，实际是 3.12；文档里的 `Secure` cookie 实际代码是 `secure=False`）。

## 目录结构与架构

- `backend/` — Python 3.12 + FastAPI + SQLAlchemy 2.0(async) + Alembic，**uv 管理**（非 pip）。分层：`app/api/v1`（路由）→ `app/services` → `app/repositories` → `app/models`；`app/core/` 为 config/database/security/dependencies/errors/response。迁移在 `backend/migrations/versions/`（当前仅 `0001_initial_schema`）。`[tool.uv] package = false`，导入按 `app.*` 路径。
- `frontend/` — React 18 + TS + Vite 6 + **Tailwind v4**（`@import "tailwindcss"` + `@theme`，**没有 tailwind.config 文件**，无 Tailwind 插件，用 `@tailwindcss/postcss`）。shadcn 风格 UI 组件手写在 `src/components/ui/`；状态用 zustand（`src/stores/`），表单 react-hook-form + zod，动画 framer-motion，图表 recharts。
- 仓库有 `docker-compose.yml`（生产部署：postgres + backend，根目录 `.env.example` 为配置模板；测试和本地 dev 不走 docker，postgres 需自己起（测试和本地 dev 都在 `localhost:54329`）。
- `.env` 与 `.env.example` 在**仓库根目录**（docker compose 默认加载；后端 `config.py` 的 `env_file` 按仓库根目录绝对路径解析，本地 dev 无需复制，直接编辑根目录 `.env`）。

## 常用命令

后端（在 `backend/` 下，一律 `uv run ...`）：

```bash
uv run uvicorn app.main:app --reload      # dev server :8000
uv run pytest                             # 34 个用例（已全绿）
uv run pytest tests/test_stats.py -k heatmap   # 单文件/单用例
uv run ruff check app && uv run mypy app # 当前均通过
uv run alembic revision -m "..."          # 生成迁移（手动跑迁移无意义，见下）
```

前端（在 `frontend/` 下）：

```bash
npm run dev          # vite :5173，代理 /api 和 /health → 127.0.0.1:8000（需后端在跑）
npm run build        # tsc -b && vite build，产物 frontend/dist/ 由后端静态托管
npm run test         # vitest run，12 个用例（已全绿）
```

验证顺序：`ruff check` → `mypy` → `pytest`（后端）；`tsc -b` → `vitest`（前端）。

## 本地开发与测试的坑

- **测试必须连 PostgreSQL**：`tests/conftest.py` 硬编码 `postgresql+asyncpg://app_user:testpass@localhost:54329/emotion_bottle_test`（端口 54329，不是 5432）。conftest 直接 `Base.metadata.drop_all/create_all`（不走 Alembic），每用例后 TRUNCATE 三张表并重建用户。本机 54329 上需存在该库和 `app_user`，否则 pytest 直接失败。
- 后端 `.env`（gitignored）里 `DATABASE_URL` 指向同一 54329 实例的 `emotion_bottle` 库，`FRONTEND_DIST` 指向本地 `frontend/dist`（容器内默认 `/app/frontend/dist`）。
- 测试登录密码 `testpass123`，conftest 通过 `PASSWORD` 环境变量注入，密码哈希由 `settings.password_hash` 启动时计算（bcrypt cost=12）。
- 速率限制器是**进程内滑动窗口**（`LoginRateLimiter`，按客户端 IP），重启即清零；写测试时注意 `login_limiter._attempts` 的清理（conftest 已处理）。

## 关键架构约定（写代码时易踩坑）

- **响应统一 envelope**：成功 `{code: 0, message: "success", data, meta?}`；错误码集中在 `app/core/errors.py`（40001 参数、40102 access 过期、40103 refresh 无效、40301 CSRF、40401 不存在、42901 限流、50000 内部错误），错误响应用 `app/core/response.py` 的 `fail()`。**前端按 `code` 数字判断**（`src/lib/api.ts`：40102 触发自动刷新），不要改错误码。
- **认证是双 HttpOnly Cookie**（access 15min / refresh 30d），refresh 仅存 SHA-256 哈希、轮换时吊销旧 token。cookie `httponly=True, samesite="lax"`，**`secure=False`**（本地纯 HTTP，别"修复"成 True）。
- **CSRF 无独立 token 存储**：`issue_csrf_token` 用 `CSRF_SECRET` 对 access token 做 HMAC 派生，login/refresh 响应体返回，前端存 zustand；`csrf_protect` 依赖校验 `X-CSRF-Token` 头。写操作（POST/PUT/DELETE）必须过 `Depends(csrf_protect)`。Axios 拦截器在写请求自动带头、40102 时单飞刷新后重放（`_retried`/`skipAuthRefresh`）。
- **数据库时区**：`TIMESTAMPTZ` 一律存 UTC；趋势/热力图查询时用 `func.timezone(tz, ...)` + `date_trunc` / `EXTRACT(ISODOW/HOUR)` 按用户时区动态计算（`stats_repository.py`）。**不要加生成列**。星期用 ISO 语义（周一=1…周日=7）。`start_date/end_date` 是**用户时区**的墙钟日期边界（`_date_range_filter` 用 `ZoneInfo(tz)` 换算后与 `timestamptz` 比较），时区来自 `USER_TIMEZONE`（IANA 名，config 校验），login/refresh 响应下发 `timezone`，前端全局按它计算"本周/今日"并展示时间（`frontend/src/lib/utils.ts` 的 `wallParts`/`wallTimeToUTC`，用 `Intl.DateTimeFormat`，无第三方库）。
- **软删除**：`anger_logs.is_deleted`，所有列表/统计查询默认 `is_deleted = FALSE`；`DELETE /logs/{id}` 只置 true。部分索引带 `postgresql_where` 部分索引条件。
- **category 是枚举**：DB CHECK + Pydantic 校验都限定 `('工作','家庭','交通','社交','其他')`，存 `NULL` 合法。
- **启动即迁移**：`app.main` lifespan 自动跑 Alembic 到 head + upsert 默认用户（`USERNAME`/`PASSWORD`/`USER_TIMEZONE`），Docker 不单独跑迁移。缺必需环境变量（`DATABASE_URL`/`USERNAME`/`PASSWORD`/`SECRET_KEY`/`CSRF_SECRET`）启动直接失败。
- `PASSWORD` 为**明文密码**（config 不再接受哈希），`settings.password_hash` 属性启动时用 bcrypt（cost=12）哈希后入库；`LOGIN_RATE_LIMIT` 格式 `N/minutes`（如 `5/5minutes`）。
- **无 `/docs`**（`docs_url=None, redoc_url=None`）；健康检查是 `/health`（做 `SELECT 1`）。`/api/v1` 前缀：auth/logs/stats 三个 router。
- 标记解决时同时更新 `updated_at` 并填 `resolved_at`；`intensity` CHECK 1-10。
- **无 RSA/应用层加密、无 Nginx**：密码靠上层 TLS 明文传输，后端 bcrypt 比对（曾评审后移除，别再加回来）。

## 环境变量（见根目录 `.env.example`）

`DATABASE_URL`、`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`（仅 docker compose 的 db 服务）、`USERNAME`、`PASSWORD`、`USER_TIMEZONE`、`SECRET_KEY`、`CSRF_SECRET`、`ACCESS_TOKEN_EXPIRE_MINUTES`、`REFRESH_TOKEN_EXPIRE_DAYS`、`LOGIN_RATE_LIMIT`、`CORS_ORIGINS`、`FRONTEND_DIST`（静态托管路径）。

## Docker 打包上传

详见 `docs/Docker镜像打包上传.md`，一键 `DOCKER_USER=pigzho bash scripts/docker-push.sh`：

- 3 阶段：Stage1 node:20 跑 `npm ci`(回退 `npm install`) + `npm run build`；Stage2 python:3.12-alpine + uv（`uv sync --frozen --no-dev`，装完删 uv 缓存）；Stage3 python:3.12-alpine 只拷 venv+代码，uvicorn 启动，HEALTHCHECK 探 `/health`。**uv 不进运行时镜像**。
- **tag 规范**：同时打 `pigzho/angerlog:latest` 与 `pigzho/angerlog:<YYYYMMDD>`（当日日期），**不用 commit hash**。
- `uv.lock` / `package-lock.json` 必须与依赖同步，否则 `--frozen` / `npm ci` 构建失败（改依赖后跑 `uv sync` / `npm install` 更新锁文件）。
- 运行时基础镜像用 **alpine**（非 slim）：uvloop/httptools 只有 glibc wheel，musl 下被跳过、uvicorn 走纯 asyncio，属锁文件条件项行为，别当成 bug "修"回去。
