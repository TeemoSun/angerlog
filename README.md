# 🌋 情绪瓶 (Angerlog)

轻量级情绪记录应用，把生气抽象为投入瓶中的小球，帮助觉察情绪触发规律，提升情绪管理能力。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **后端**：Python 3.11 + FastAPI + SQLAlchemy 2.0 (async) + Alembic
- **数据库**：PostgreSQL 15+
- **部署**：Docker Compose（HTTPS 由上层代理提供）

## 文档

详细设计见 [`docs/设计文档.md`](docs/设计文档.md)。

## 功能

- 单用户安全登录（双 Token + HttpOnly Cookie）
- 记录生气（原因 / 程度 1-10 / 分类），小球入瓶动画
- 高强度（≥8）记录时 4-7-8 呼吸引导
- 瓶子水位随累计记录上升
- 解决标记与解决办法
- 统计分析（趋势 / 分类 / 热力图，按用户时区）
- 软删除保留历史，数据导出 CSV/JSON