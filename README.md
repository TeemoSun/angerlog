# 🌋 情绪瓶 (Angerlog)

轻量级情绪记录应用，把生气抽象为投入瓶中的小球，帮助觉察情绪触发规律，提升情绪管理能力。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4（shadcn 风格组件）+ zustand + recharts
- **后端**：Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Alembic
- **数据库**：PostgreSQL 15+
- **部署**：Docker 镜像分发（HTTPS 由上层反向代理提供）

## 功能

- 单用户安全登录（双 Token + HttpOnly Cookie）
- 记录生气（原因 / 程度 1-10 / 分类），小球入瓶动画
- 高强度（≥8）记录时 4-7-8 呼吸引导
- 瓶子水位随累计记录上升
- 解决标记与解决办法
- 统计分析（趋势 / 分类 / 热力图，按用户时区）
- 软删除保留历史

## 文档

- 设计文档：[`docs/设计文档.md`](docs/设计文档.md)
- Docker 镜像打包上传：[`docs/Docker镜像打包上传.md`](docs/Docker镜像打包上传.md)

## 快速开始（本地开发）

需要：PostgreSQL（本地测试与开发均在 `localhost:54329`）、Python 3.12 + [uv](https://docs.astral.sh/uv/)、Node.js 20+。

1. **准备数据库**：在 `54329` 端口启动一个 PostgreSQL，并创建用户和两个库：

   ```sql
   CREATE USER app_user WITH PASSWORD 'testpass';
   CREATE DATABASE emotion_bottle OWNER app_user;
   CREATE DATABASE emotion_bottle_test OWNER app_user;  -- 测试用
   ```

2. **启动后端**：

   ```bash
   cd backend
   cp .env.example .env   # 修改 DATABASE_URL、USERNAME、PASSWORD_HASH、SECRET_KEY、CSRF_SECRET
   uv sync
   uv run uvicorn app.main:app --reload    # http://localhost:8000
   ```

   首次启动会自动执行 Alembic 迁移并写入默认用户。`PASSWORD_HASH` 需为 bcrypt 哈希（cost=12），可用项目内命令生成：

   ```bash
   uv run python -c "from app.core.security import hash_password; print(hash_password('你的密码'))"
   ```

3. **启动前端**（另开终端）：

   ```bash
   cd frontend
   npm install
   npm run dev           # http://localhost:5173，/api 与 /health 已代理到 :8000
   ```

### 测试

```bash
cd backend && uv run pytest                        # 34 个用例（需 54329 上 emotion_bottle_test 库）
cd frontend && npm run test                        # 12 个用例
cd backend && uv run ruff check app && uv run mypy app   # lint + 类型检查
cd frontend && npm run build                       # tsc -b && vite build
```

## 源码部署（不用 Docker）

1. **构建前端**：

   ```bash
   cd frontend && npm install && npm run build     # 产物在 frontend/dist/
   ```

2. **安装后端依赖并配置**：

   ```bash
   cd backend
   cp .env.example .env
   # 修改：DATABASE_URL 指向你的 PostgreSQL、USERNAME、PASSWORD_HASH、
   #       SECRET_KEY、CSRF_SECRET、FRONTEND_DIST 指向 frontend/dist 的绝对路径
   uv sync --no-dev
   ```

3. **启动**（首次启动自动迁移 + 写入默认用户，前端由后端静态托管在 `/`）：

   ```bash
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   生产环境建议用 systemd / supervisor 托管该进程，前方由 Nginx 等反向代理提供 HTTPS。

## Docker 部署（docker compose）

镜像构建与上传见 [`docs/Docker镜像打包上传.md`](docs/Docker镜像打包上传.md)；compose 配置会直接构建本地代码（`docker-compose.yml` 含 `build`），无需预先拉取镜像。

### 1. 准备环境变量

```bash
cp .env.example .env   # 必须修改 POSTGRES_PASSWORD、PASSWORD_HASH、SECRET_KEY、CSRF_SECRET
```

> 缺失或占位的必需变量会导致 `docker compose up` 直接报错退出。`PASSWORD_HASH` 需为 bcrypt 哈希（cost=12），可用项目内命令生成：
>
> ```bash
> cd backend && uv run python -c "from app.core.security import hash_password; print(hash_password('你的密码'))"
> ```

### 2. 构建并启动

```bash
docker compose up -d --build    # 构建镜像并启动 postgres + backend
docker compose ps               # 查看状态（db 健康后 backend 才会启动）
```

- PostgreSQL 数据保存在命名卷 `angerlog_pgdata`，`docker compose down` 不会丢失数据；如需重置数据可 `docker compose down -v`。
- backend 启动时自动执行 Alembic 迁移并 upsert 默认用户，无需手动建库。

### 3. 验证

```bash
curl http://localhost:8000/health        # 期望 {"status":"ok"}
```

打开 `http://localhost:8000/` 即可使用。前端由后端静态托管，默认使用 `http://localhost:8000` 访问（如需域名，修改 `.env` 中 `CORS_ORIGINS` 并重建）。

### 其他常用命令

```bash
docker compose logs -f backend   # 查看后端日志
docker compose down              # 停止（保留数据卷）
docker compose up -d             # 之后启动（免 build）
```

### 复用已有的 PostgreSQL

只需在 `.env` 中提供远端实例的 `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`，然后移除 `docker-compose.yml` 中的 `db` 服务与 `DATABASE_URL` 中的 `@db:5432` 改为你的地址（或直接为 `backend` 服务单独设置 `DATABASE_URL` 环境变量覆盖）。
