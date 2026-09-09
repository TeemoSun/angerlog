# ===== Stage 1: 前端构建 =====
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build && rm -rf dist/fonts

# ===== Stage 2: Go 后端静态编译 =====
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/backend
ENV GOPROXY=https://goproxy.cn,direct
RUN apk add --no-cache ca-certificates
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /app/angerlog ./cmd/angerlog

# ===== Stage 3: 运行时（极简 Alpine 生产镜像，常驻内存 <15MB）=====
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Layer 1: 前端大体积静态切片字体（独立分层长期缓存，~33MB）
COPY frontend/public/fonts /app/frontend/dist/fonts

# Layer 2: 前端编译生成物（日常业务代码与样式）
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Layer 3: Go 静态二进制（~11MB，内置 -healthcheck 探针）
COPY --from=backend-builder /app/angerlog /app/angerlog

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/app/angerlog", "-healthcheck"]

CMD ["/app/angerlog"]
