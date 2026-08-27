# Docker 镜像打包与上传流程

本项目通过根目录 `Dockerfile`（多阶段构建）打包镜像并上传到 Docker Hub，便于部署机器直接 `docker pull`。

## 前置条件

1. 本机已安装 Docker。
2. 已在 Docker Hub 注册账号，并在本机执行过 `docker login`（凭证存于 `~/.docker/config.json`）。
3. 当前工作目录为仓库根目录（含 `Dockerfile`、`frontend/`、`backend/`）。
4. 已安装 `git`，且仓库有提交记录（用于生成 commit tag）。

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

## tag 命名规范

每次构建同时打两个 tag：

- `<user>/angerlog:latest` —— 始终指向最新构建，便于部署机器稳定拉取。
- `<user>/angerlog:<date>` —— 形如 `20260821`（YYYYMMDD），按发布日期归档，便于回滚定位。

其中 `<user>` 为 Docker Hub 用户名（本项目使用 `pigzho`）。

> **同日多次发布**：若同一天内多次构建发布，日期 tag 会被覆盖（`docker push` 同名 tag 会更新该 tag 指向的新 digest）。这是预期行为——日期 tag 始终代表当日最新构建。如需保留历史版本快照，可在日期后追加 `-v2`、`-v3` 等后缀（如 `20260821-v2`）。

## 打包与上传步骤

以下命令在仓库根目录执行。将 `<user>` 替换为实际 Docker Hub 用户名。

### 1. 构建镜像

```bash
docker build -t <user>/angerlog:latest -t <user>/angerlog:$(date +%Y%m%d) .
```

- 构建会走前端 `npm run build` + 后端 `uv sync` 全流程，首次较慢，后续命中 Docker 缓存。
- 同时打 `latest` 与当日日期 tag。

### 2. 登录 Docker Hub（如未登录）

```bash
docker login
```

输出 `Login Succeeded` 即可。已登录可跳过。

### 3. 推送镜像

```bash
docker push <user>/angerlog:latest
docker push <user>/angerlog:$(date +%Y%m%d)
```

推送完成后，部署机器 `docker pull <user>/angerlog:latest` 即可拉取。

## 删除 tag

### 删除本地 tag

```bash
docker rmi <user>/angerlog:<tag>
```

### 删除远程 tag（Docker Hub）

Docker CLI 不支持删除远程 tag，需通过 Docker Hub API：

```bash
# 从 ~/.docker/config.json 读取登录凭证换取 JWT
USERPASS=$(python3 -c 'import json; d=json.load(open("/home/teemo/.docker/config.json")); print(d["auths"]["https://index.docker.io/v1/"]["auth"])' | base64 -d)
USER=$(echo "$USERPASS" | cut -d: -f1)
PASS=$(echo "$USERPASS" | cut -d: -f2-)
TOKEN=$(curl -s "https://hub.docker.com/v2/users/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 删除指定 tag（HTTP 204 表示成功）
curl -s -o /dev/null -w "%{http_code}\n" \
  -X DELETE "https://hub.docker.com/v2/repositories/<user>/angerlog/tags/<tag>/" \
  -H "Authorization: JWT $TOKEN"
```

将 `<user>` 与 `<tag>` 替换为实际值。删除远程 tag 不影响镜像 digest，仅在 Docker Hub 界面移除该标签引用。

## 部署机使用远程镜像

本项目需配合 PostgreSQL 数据库（见 `docker-compose.yml`）。默认端口 `8000`：

```bash
cp .env.example .env   # 修改 USERNAME、PASSWORD、SECRET_KEY、CSRF_SECRET、POSTGRES_PASSWORD 等

# 方式一：docker compose（自动构建镜像并带起 postgres + backend）
docker compose up -d --build

# 方式二：docker run（需自行准备可达的 PostgreSQL）
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  pigzho/angerlog:latest
```

`docker-compose.yml` 中的 `build` 会直接构建本地代码（`Dockerfile`），不依赖已推送的镜像；也可改为 `image: pigzho/angerlog:latest` 直接使用远程镜像（需自行提供可达的 PostgreSQL）。完整使用说明见 `README.md`。

## 一键脚本参考

仓库已提供 `scripts/docker-push.sh`（需 `chmod +x`），等效于上文构建 + 推送步骤：

```bash
DOCKER_USER=pigzho bash scripts/docker-push.sh
```

脚本内容：

```bash
#!/usr/bin/env bash
set -euo pipefail

USER="${DOCKER_USER:-pigzho}"
IMAGE="angerlog"
DATE_TAG="$(date +%Y%m%d)"

echo "==> Building $USER/$IMAGE:latest and :$DATE_TAG"
docker build -t "$USER/$IMAGE:latest" -t "$USER/$IMAGE:$DATE_TAG" .

echo "==> Pushing tags"
docker push "$USER/$IMAGE:latest"
docker push "$USER/$IMAGE:$DATE_TAG"

echo "==> Done: $USER/$IMAGE:latest, :$USER/$IMAGE:$DATE_TAG"
```