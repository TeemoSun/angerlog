# Docker 镜像打包与发布流程

本项目镜像托管于 **GitHub Container Registry (`ghcr.io`)**，支持 **GitHub Actions 自动构建发布** 与 **本地一键脚本构建**。

## 自动化构建（推荐）

仓库已配置 GitHub Actions 工作流（`.github/workflows/docker-publish.yml`）：

- **触发条件**：当代码推送到 `main` 分支或发布版本标签（`v*.*.*`）时，GitHub Actions 会自动触发多阶段构建，并将镜像推送至 `ghcr.io/teemosun/angerlog`。
- **自动标签**：
  - `latest`：始终指向 `main` 分支最新构建。
  - `YYYYMMDD`：按构建发布日期归档（如 `20260828`）。
  - `sha-xxxxxxx`：基于 Git Commit SHA。
  - `vX.Y.Z`：基于 Git Release 标签。

---

## Dockerfile 说明

`Dockerfile` 为多阶段构建（3 阶段）：

- **Stage 1 `frontend-builder`**：基于 `node:20-bookworm-slim`，执行 `npm ci`（回退 `npm install`）+ `npm run build`，产出 `frontend/dist`（构建完成后剔除重复的 `fonts`，由独立层接管）。
- **Stage 2 `backend-deps`**：基于 `python:3.12-alpine`，安装 `uv`（来自 `ghcr.io/astral-sh/uv:latest`），`uv sync --frozen --no-dev` 安装后端依赖到 `/opt/venv`，随后删除 uv 缓存目录（避免缓存层带入运行时镜像）。
- **Stage 3 `runtime`**：基于 `python:3.12-alpine`，**按变更频率从低到高分层缓存**：
  1. `/opt/venv` 依赖层（极低频，~77MB）
  2. `frontend/public/fonts` 静态切片字体资产层（极低频，~33MB，独立分层长期缓存）
  3. 后端应用业务代码（高频，~320KB）
  4. 前端应用 JS/CSS 产物（最高频，~11MB，推送压缩后仅约 3MB）
  暴露 `8000` 端口，以 uvicorn 启动。uv 二进制不进运行时镜像。

> 当前镜像约 **171MB**（含寒蝉活宋 + 小赖手写体全套中文字库切片）。
> - **分层缓存优化**：将 33MB 静态字体层与前端日常业务代码彻底解耦，日常修改前端只需推送 ~3MB 压缩增量，推送提速 90% 以上！
> - 基础镜像采用 `alpine`（musl 架构）。
>
> **注意**：alpine 下 uvicorn 走纯 asyncio 事件循环（uvloop/httptools 仅 glibc 有 wheel，musl 下 `uv sync` 自动跳过，属锁文件条件项行为，非配置缺失）；后端代码本身不依赖 glibc，逻辑不变。

> 注意：alembic 迁移由 `app.main.lifespan` 在容器启动时自动执行，Dockerfile 不单独运行迁移。
> 镜像声明 `HEALTHCHECK`（探测 `/health`）；`SECRET_KEY` / `CSRF_SECRET` / `PASSWORD` 为空或占位值时容器启动直接报错退出。

---

## 部署机使用镜像

本项目需配合 PostgreSQL 数据库（见 `docker-compose.yml`）。默认端口 `8000`：

```bash
cp .env.example .env   # 修改 USERNAME、PASSWORD、SECRET_KEY、CSRF_SECRET、POSTGRES_PASSWORD 等

# 方式一：docker compose（推荐，带起 postgres + backend）
docker compose up -d

# 方式二：docker run（需自行准备可达的 PostgreSQL）
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  ghcr.io/teemosun/angerlog:latest
```

> **提示**：公开镜像无需执行 `docker login`，任何机器均可直接拉取。

---

## 本地手动构建与推送（可选）

如需在本地手动构建并推送到 GHCR：

### 1. 登录 GitHub Container Registry

```bash
# 使用具备 packages:write 权限的 GitHub Personal Access Token (PAT) 登录
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin
```

### 2. 执行一键构建推送脚本

仓库已提供 `scripts/docker-push.sh`（需 `chmod +x`）：

```bash
bash scripts/docker-push.sh
```

或手动构建推送：

```bash
docker build -t ghcr.io/teemosun/angerlog:latest -t ghcr.io/teemosun/angerlog:$(date +%Y%m%d) .
docker push ghcr.io/teemosun/angerlog:latest
docker push ghcr.io/teemosun/angerlog:$(date +%Y%m%d)
```