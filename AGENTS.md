# AGENTS.md

情绪瓶（angerlog）：把生气记录抽象为投入瓶中的小球，帮助觉察情绪规律。React 18 前端 + Go (Chi + pgx) 后端 + PostgreSQL，Docker 分发。设计决策以 `docs/设计文档.md` 为准，前端视觉风格以 `docs/美术风格指南.md` 为准，但**实现细节以代码为准**（原 Python 后端已完整备份至 `backend_py/`）。

## 目录结构与架构

- `backend/` — Go 1.23 + Chi v5 + pgx/v5 + 原生标准库（`CGO_ENABLED=0` 静态编译）。分层：`cmd/angerlog/main.go`（启动与探活）→ `internal/api/v1`（路由控制与中间件）→ `internal/service`（业务逻辑）→ `internal/repository`（数据库访问）→ `internal/models`（DTO 与实体）；`internal/config`、`internal/security`、`internal/database` 为核心配置/安全/数据迁移。
- `frontend/` — React 18 + TS + Vite 6 + **Tailwind v4**（`@import "tailwindcss"` + `@theme`，**没有 tailwind.config 文件**，无 Tailwind 插件，用 `@tailwindcss/postcss`）。shadcn 风格 UI 组件手写在 `src/components/ui/`；状态用 zustand（`src/stores/`），表单 react-hook-form + zod，动画 framer-motion，图表 recharts。
- 仓库有 `docker-compose.yml`（生产部署：postgres + backend，根目录 `.env.example` 为配置模板；测试和本地 dev 不走 docker，postgres 需自己起（测试和本地 dev 都在 `localhost:54329`）。
- `.env` 与 `.env.example` 在**仓库根目录**（docker compose 默认加载；后端 `config.go` 会加载根目录 `.env`，本地 dev 无需复制，直接编辑根目录 `.env`）。

## 常用命令

后端（在 `backend/` 下）：

```bash
go run ./cmd/angerlog                 # dev server :8000
go run ./cmd/angerlog -healthcheck    # 执行内置健康检查探针
go test -v ./tests/...                # 自动化测试套件（覆盖全部核心用例）
go vet ./...                          # Go 静态代码检查
CGO_ENABLED=0 go build -o angerlog ./cmd/angerlog # 静态编译二进制
```

前端（在 `frontend/` 下）：

```bash
npm run dev          # vite :5173，代理 /api 和 /health → 127.0.0.1:8000（需后端在跑）
npm run build        # tsc -b && vite build，产物 frontend/dist/ 由后端静态托管
npm run test         # vitest run（已全绿）
```

验证顺序：`go vet ./...` → `go test -v ./tests/...`（后端）；`tsc -b` → `vitest`（前端）。

## 本地开发与测试的坑

- **测试必须连 PostgreSQL**：`tests/test_helper.go` 连接 `postgres://app_user:testpass@localhost:54329/emotion_bottle_test`（端口 54329，不是 5432）。启动时自动运行建表与索引迁移，每用例前后 TRUNCATE 三张表并重建默认用户。本机 54329 上需存在该库和 `app_user`。
- 后端 `.env` 里 `DATABASE_URL` 指向同一 54329 实例的 `emotion_bottle` 库，`FRONTEND_DIST` 指向本地 `frontend/dist`（容器内默认 `/app/frontend/dist`）。
- 测试登录密码 `testpass123`，密码哈希启动时用 bcrypt (cost=12) 计算。
- 速率限制器是**进程内滑动窗口**（`LoginRateLimiter`，按客户端 IP），重启即清零；测试时已自动重置。

## 关键架构约定（写代码时易踩坑）

- **响应统一 envelope**：成功 `{code: 0, message: "success", data, meta?}`；错误码集中在 `internal/models/errors.go`（40001 参数、40101 凭证错误、40102 access 过期、40103 refresh 无效、40301 CSRF、40401 不存在、42901 限流、50000 内部错误）。**前端按 `code` 数字判断**（`src/lib/api.ts`：40102 触发自动刷新），切勿修改错误码。
- **认证是双 HttpOnly Cookie**（access 15min / refresh 30d），refresh 仅存 SHA-256 哈希、轮换时吊销旧 token。cookie `httponly=True, samesite="lax"`，**`secure=False`**（本地纯 HTTP 兼容）。
- **CSRF 无独立 token 存储**：`IssueCSRFToken` 用 `CSRF_SECRET` 对 access token 做 HMAC-SHA256 派生，login/refresh 响应体返回，前端存 zustand；`RequireCSRF` 依赖校验 `X-CSRF-Token` 头。写操作（POST/PUT/DELETE）必须过 `RequireCSRF`。Axios 拦截器在写请求自动带头、40102 时单飞刷新后重放。
- **数据库时区**：`TIMESTAMPTZ` 一律存 UTC；趋势/热力图查询时用 `timezone($tz, created_at)` + `date_trunc` / `EXTRACT(ISODOW/HOUR)` 按用户时区动态计算。星期用 ISO 语义（周一=1…周日=7）。`start_date/end_date` 是**用户时区**的墙钟日期边界（换算后与 `timestamptz` 比较），时区来自 `USER_TIMEZONE`（IANA 名，config 校验），login/refresh 响应下发 `timezone`，前端全局按它展示。
- **软删除**：`anger_logs.is_deleted`，所有列表/统计查询默认 `is_deleted = FALSE`；`DELETE /logs/{id}` 只置 true。部分索引带 `WHERE is_deleted = FALSE`。
- **category 是枚举**：CHECK 限定 `('工作','家庭','交通','社交','其他')`，存 `NULL` 合法。
- **启动即迁移**：`cmd/angerlog/main.go` 启动时自动执行 DDL 建表与索引 + upsert 默认用户（`USERNAME`/`PASSWORD`/`USER_TIMEZONE`）。
- **健康检查**：端点 `/health`（做 `SELECT 1`，返回 `{"status":"ok"}`）；容器内置 `HEALTHCHECK CMD ["/app/angerlog", "-healthcheck"]`。

## Docker 打包与运行

- 3 阶段多阶段构建：
  - Stage 1: `node:20-bookworm-slim` 构建前端
  - Stage 2: `golang:1.23-alpine` 纯静态编译 Go 二进制 (`CGO_ENABLED=0`)
  - Stage 3: `alpine:3.20` 极简运行时，内置字体与静态资源，常驻内存仅 ~11MB（相比原 Python 降低 85%+）。
