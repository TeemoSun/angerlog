# 🌋 情绪瓶 (Angerlog)

轻量级情绪记录应用，把生气抽象为投入瓶中的小球，帮助觉察情绪触发规律，提升情绪管理能力。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4（shadcn 风格组件）+ zustand + recharts
- **后端**：Go 1.23 + Chi v5 + pgx/v5 (CGO_ENABLED=0 静态编译，常驻内存仅 ~11MB)
- **数据库**：PostgreSQL 15+
- **部署**：Docker 极简 Alpine 镜像分发（HTTPS 由上层反向代理提供）

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

需要：PostgreSQL（本地测试与开发均在 `localhost:54329`）、Go 1.23+、Node.js 20+。

1. **准备环境变量**：从模板创建根目录 `.env`，修改 `DATABASE_URL`、`USERNAME`、`PASSWORD`、`SECRET_KEY`、`CSRF_SECRET`：

   ```bash
   cp .env.example .env
   ```

2. **启动后端**：

   ```bash
   cd backend
   go run ./cmd/angerlog    # http://localhost:8000
   ```

   首次启动会自动执行数据迁移并写入默认用户。`PASSWORD` 为明文密码，启动时自动 bcrypt 哈希（cost=12）后入库。

3. **启动前端**（另开终端）：

   ```bash
   cd frontend
   npm install
   npm run dev           # http://localhost:5173，/api 与 /health 已代理到 :8000
   ```

### 测试与静态检查

```bash
cd backend && go test -v ./tests/...               # 自动化集成测试（需 54329 上 emotion_bottle_test 库）
cd backend && go vet ./...                         # Go 静态代码检查
cd frontend && npm run test                        # 前端自动化测试
cd frontend && npm run build                       # 前端编译打包
```

## 源码部署（不用 Docker）

1. **构建前端**：

   ```bash
   cd frontend && npm install && npm run build     # 产物在 frontend/dist/
   ```

2. **配置与编译后端**：

   ```bash
   cp .env.example .env
   # 修改：DATABASE_URL 指向你的 PostgreSQL、USERNAME、PASSWORD、
   #       SECRET_KEY、CSRF_SECRET、FRONTEND_DIST 指向 frontend/dist 的绝对路径
   cd backend
   CGO_ENABLED=0 go build -ldflags="-s -w" -o angerlog ./cmd/angerlog
   ```

3. **启动**（首次启动自动迁移 + 写入默认用户，前端由后端静态托管在 `/`）：

   ```bash
   ./angerlog
   ```

   生产环境建议用 systemd / supervisor 托管该进程，前方由 Nginx 等反向代理提供 HTTPS。

## Docker 部署（docker compose）

镜像构建与上传见 [`docs/Docker镜像打包上传.md`](docs/Docker镜像打包上传.md)；compose 配置会直接构建本地代码（`docker-compose.yml` 含 `build`），无需预先拉取镜像。

### 1. 准备环境变量

```bash
cp .env.example .env   # 必须修改 POSTGRES_PASSWORD、PASSWORD、SECRET_KEY、CSRF_SECRET
```

> 缺失或占位的必需变量会导致 `docker compose up` 直接报错退出。`PASSWORD` 为明文密码（如含特殊字符需转义或用引号包裹），启动时自动 bcrypt 哈希（cost=12）后入库。

### 2. 构建并启动

```bash
docker compose up -d --build    # 构建镜像并启动 postgres + backend
docker compose ps               # 查看状态（db 健康后 backend 才会启动）
```

- PostgreSQL 数据保存在命名卷 `angerlog_pgdata`，`docker compose down` 不会丢失数据；如需重置数据可 `docker compose down -v`。
- backend 启动时自动执行数据库迁移并 upsert 默认用户，无需手动建库。
- backend 镜像内置原生健康检查探针：`/app/angerlog -healthcheck`。

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
