# Merge frontend and backend into a single Docker image

## Goal

将当前 `subpilot-backend` + `subpilot-frontend` 双镜像部署收敛为 **一个可发布、可 `docker compose up` 的单一镜像**，降低部署心智负担，同时保持现有本地前后端分离开发体验不变。

## Background

- 仓库 monorepo：`backend/`（FastAPI + SQLite）+ `frontend/`（React/Vite）。
- 现发布形态：`docker-compose.yml` 两个 service → GHCR `subpilot-backend` / `subpilot-frontend`。
- 前端生产请求同源相对路径 `baseURL: "/api/v1"`；现 `frontend/nginx.conf` 将 `/api/`、`/static/` 反代到 backend。
- 后端已挂 `/static`（logo）；不托管 SPA。
- 本地 `make dev`：API `:8000` + Vite `:5173`，与生产镜像解耦。

## Decisions

| 项 | 选择 |
|----|------|
| 运行时 | **A：Nginx + uvicorn 同容器**（supervisord 编排，见 design） |
| 旧双镜像 | **立刻停发**；README 写迁移说明 |
| 镜像名 | `ghcr.io/<owner>/subpilot`（文档示例 `maplumex`） |
| 对外端口 | **主机 7743**（容器内 Nginx 标准 `listen 80`，compose `7743:80`） |
| 默认 CORS | `http://localhost:7743` |

## Requirements

- R1. 单个 Docker 镜像可启动完整 SubPilot（UI + API + logo 静态资源）。
- R2. 对外默认只暴露 HTTP **7743**。
- R3. SQLite 数据通过 volume 持久化（路径保持 `/app/data` 语义）。
- R4. Release 只推送 `subpilot` 一个镜像；标签：`version` / `major.minor` / `latest`。
- R5. 更新 `docker-compose.yml`、README、`.env.example`、release workflow。
- R6. 本地 `make dev` 前后端分离开发保持可用。
- R7. 生产：Nginx 托管 SPA；`/api/`、`/static/` 反代本机 uvicorn。
- R8. 停止发布旧双镜像并提供迁移说明。

## Acceptance Criteria

- [ ] AC1. `docker compose up --build` 仅一个 app service 即可访问完整 Web UI 与 API。
- [ ] AC2. 经 `http://localhost:7743` 同源访问时，登录/订阅/logo 核心路径可用；SPA 路由刷新不 404。
- [ ] AC3. GHCR 发布只构建/推送 `subpilot`；文档无双镜像发布清单。
- [ ] AC4. 旧双镜像不在 release workflow / 文档发布清单中；迁移说明可执行。
- [ ] AC5. README 按新形态（含端口 7743）可从零部署。
- [ ] AC6. 容器内 Nginx 提供 SPA；`/api/` 与 `/static/` 正确反代到本机 uvicorn。

## Out of Scope

- 业务功能、API 契约、DB schema 变更
- K8s / 多副本 / 对象存储 / TLS 终结
- 本地开发强制改为单容器
- 双轨继续发布 `subpilot-backend` / `subpilot-frontend`

## Technical Notes

详见同目录 `design.md`、`implement.md`、`research/single-image-runtime.md`。要点：

- 根目录 multi-stage `Dockerfile` + `deploy/nginx.conf` + `deploy/supervisord.conf`
- Nginx 容器内 `listen 80`；主机映射 `7743:80`
- uvicorn 仅绑 `127.0.0.1:8000`
- 应用代码原则上不改

## Open Questions

无阻塞项。
