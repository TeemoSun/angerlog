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

## Docker 部署

镜像构建与上传见 [`docs/Docker镜像打包上传.md`](docs/Docker镜像打包上传.md)；已构建镜像可直接拉取：

```bash
docker pull pigzho/angerlog:latest
```

### 方式一：docker run（自带 postgres 容器）

```bash
# 1. 先起 PostgreSQL 并建库（示例密码自行修改）
docker run -d --name angerlog-pg \
  -e POSTGRES_USER=app_user \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=emotion_bottle \
  -p 54329:5432 \
  -v angerlog-pgdata:/var/lib/postgresql/data \
  postgres:15-alpine

# 2. 准备环境变量文件（参考 backend/.env.example）
cat > angerlog.env <<'EOF'
DATABASE_URL=postgresql+asyncpg://app_user:testpass@localhost:54329/emotion_bottle
USERNAME=admin
PASSWORD_HASH=<bcrypt 哈希，cost=12>
USER_TIMEZONE=Asia/Shanghai
SECRET_KEY=<随机长字符串>
CSRF_SECRET=<随机长字符串>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
LOGIN_RATE_LIMIT=5/5minutes
CORS_ORIGINS=http://localhost:8000
FRONTEND_DIST=/app/frontend/dist
EOF

# 3. 启动应用（注意：容器内连宿主机的 postgres 需用 host 网络或改为容器网络）
docker run -d --name angerlog --network host --env-file angerlog.env pigzho/angerlog:latest
```

> 说明：示例用 `--network host` 简化容器间数据库访问；若不用 host 网络，请把 `DATABASE_URL` 的 host 改为 postgres 容器名，并让两个容器在同一自定义 network 中。启动时容器会自动执行 Alembic 迁移并 upsert 默认用户；`SECRET_KEY`/`CSRF_SECRET`/`PASSWORD_HASH` 为空或占位值时容器启动直接退出。

### 方式二：docker run（复用已有的 PostgreSQL）

```bash
docker run -d --name angerlog \
  -p 8000:8000 \
  --env-file angerlog.env \
  pigzho/angerlog:latest
```

其中 `angerlog.env` 的 `DATABASE_URL` 指向你现有的 PostgreSQL 实例。

### 验证

```bash
curl http://localhost:8000/health        # 期望 {"status":"ok"}
```

打开 `http://localhost:8000/` 即可使用。
