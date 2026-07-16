# SubPilot

**冷静、可靠的订阅追踪工具 —— 管理你周期性开支的稳重助手。**

[English](./README.md)

SubPilot 把分散在各处的订阅集中到一个地方，回答三个问题：我有哪些订阅、每月/每年总共花多少、哪些马上要续费。它存在的核心理由是消除"漏续费"的焦虑 —— 续费提醒是第一公民，而不是埋在设置深处的附属功能。

成功的标志：你打开 SubPilot，几秒内确认"本月安全 / 有一笔即将扣款"，然后放心关掉。

---

## 功能

- **订阅管理** — 订阅的增删改查，支持计费周期（天 / 周 / 月 / 年）、币种、分类、支付方式、备注和 logo。
- **续费优先的仪表板** — 即将到期的订阅是首页第一视觉焦点，高于总额和趋势图。
- **自动续费** — 每日调度器为开启自动续费的活跃订阅推进 `next_billing_date`。
- **续费提醒** — 每个订阅可独立设置提醒窗口（默认或自定义提前天数）。到期提醒在每次扫描中合并为单条汇总消息。
- **统计** — 月度 / 年度支出、月度趋势、未来 30 天预测。
- **多币种** — 按需获取汇率，统一换算为展示币种。
- **现金流预报** — 即将到来的扣款按日历排列。
- **认证** — JWT access + refresh 令牌，bcrypt 密码哈希。
- **国际化** — 英文（默认）与简体中文，按浏览器语言自动检测。
- **暗色模式** — 一等公民主题，非附属反转。

## 技术栈

| 层级   | 技术栈                                                                                |
| ------ | ------------------------------------------------------------------------------------- |
| 后端   | FastAPI、SQLAlchemy、Alembic、APScheduler、python-jose、passlib[bcrypt]、Python 3.12+ |
| 前端   | React 19、Vite、TypeScript、Tailwind CSS 4、shadcn、Recharts、i18next                 |
| 运行时 | 单 Docker 镜像 —— Nginx（SPA + 静态资源）+ uvicorn，由 supervisord 托管               |
| 数据   | SQLite（文件型，通过 volume 持久化）                                                   |

## 快速开始（Docker）

已发布镜像为 `ghcr.io/maplumex/subpilot`。Compose 对外暴露主机端口 **7743**。

无需 clone 仓库，拉取所需文件即可一键部署：

```bash
# 1. 从仓库拉取 docker-compose.yml 和 .env.example
curl -LO https://raw.githubusercontent.com/MaplumeX/SubPilot/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/MaplumeX/SubPilot/main/.env.example

# 2. 编辑 .env，将 SECRET_KEY 改为一段长随机字符串
#    （可用 openssl rand -hex 32 生成）

# 3. 启动
docker compose up -d
```

打开 `http://localhost:7743` 注册账号即可使用。

### 必需的环境变量

| 变量名          | 示例值                               | 说明                                                          |
| --------------- | ------------------------------------ | ------------------------------------------------------------- |
| `SECRET_KEY`    | 一段足够长的随机字符串               | 必填。启动时会拒绝开发默认值。                                |
| `DATABASE_URL`  | `sqlite:///./data/subpilot.db`       | 由 Compose 自动设置；如需外部数据库可自行覆盖。               |
| `CORS_ORIGINS`  | `http://localhost:7743`              | 允许的来源列表，逗号分隔。默认为 compose 来源。               |

指定版本运行：

```bash
SUBPILOT_VERSION=1.1.0 docker compose up -d
```

## 本地开发

前置条件：Python 3.12+ 并安装 [`uv`](https://docs.astral.sh/uv/)，Node.js 22+。

```bash
# 同时安装后端和前端依赖
make install

# 并行启动后端 (uvicorn :8000) 与前端 (vite :5173)
make dev
```

前端开发服务器会把 `/api` 代理到后端。打开 `http://localhost:5173`。

仅后端：

```bash
cd backend && uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

仅前端：

```bash
cd frontend && npm install
npm run dev
```

## 项目结构

```
SubPilot/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI 应用 + 生命周期调度器
│   │   ├── config.py          # pydantic-settings 配置
│   │   ├── routers/           # auth、subscriptions、categories、payment_methods
│   │   ├── models/            # SQLAlchemy 模型
│   │   ├── schemas/           # Pydantic schema
│   │   └── services/          # 续费、提醒、汇率、现金流预报
│   ├── alembic/               # 数据库迁移
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # axios 客户端
│   │   ├── components/        # 基于 shadcn 的 UI 组件
│   │   ├── pages/             # Dashboard、Subscriptions、Calendar、Statistics、Settings
│   │   ├── i18n/              # en.json、zh-CN.json
│   │   └── routes.tsx
│   └── package.json
├── deploy/                    # nginx.conf、supervisord.conf、healthcheck
├── Dockerfile                 # 多阶段：前端构建 → 单运行时
├── docker-compose.yml
└── .github/workflows/release.yml
```

## 部署

### 单 Docker 镜像（v1.1.0+）

单个镜像在容器 80 端口同时提供 SPA 和 API —— Nginx 在回环地址反向代理 uvicorn。健康检查把 `/auth/me` 返回 401/403 视为"API 已就绪"（该接口要求认证）。

### 从双镜像迁移（1.1.0 之前）

v1.1.0 用单个 `subpilot` 镜像取代了原先的 `subpilot-backend` 与 `subpilot-frontend` 两个镜像。

1. 拉取 `ghcr.io/maplumex/subpilot:1.1.0`（或 `latest`）。
2. 将 `docker-compose.yml` 更新为上方所示的单服务形态（主机端口 `7743` → 容器 `80`）。
3. 把原本写在 backend 服务上的环境变量移到这个唯一服务上。
4. 容器内 SQLite 路径为 `/app/data/subpilot.db` —— 保留同一个 volume 即可延续数据。

### 发布流水线

符合 `v*` 的 tag 会触发 `.github/workflows/release.yml`，流水线会：

1. 校验 `VERSION` 文件与 tag 一致。
2. 构建并推送镜像到 GHCR，附带 `major.minor`、`major.minor.patch`、`latest` 标签。
3. 从 `CHANGELOG.md` 提取对应版本的小节作为说明，创建 GitHub Release。

发版步骤：在同一个 commit 中更新 `VERSION`、`backend/pyproject.toml`、`frontend/package.json` 的版本号，然后打 `vX.Y.Z` tag。

## 后台任务

应用启动时初始化调度器，包含三个定时任务：

| 任务         | 间隔      | 用途                                                              |
| ------------ | --------- | ----------------------------------------------------------------- |
| 自动续费     | 1 天      | 为开启自动续费的活跃订阅推进 `next_billing_date`。                |
| 汇率获取     | 1 天      | 拉取最新汇率，用于多币种换算。                                    |
| 提醒扫描     | 1 分钟    | 扫描到期提醒并按用户合并为单条消息。                              |

三个任务在启动时也会各执行一次作为重启后的补偿（通过按用户时间 + 幂等门控保证安全）。

## 许可

保留所有权利。本项目当前未以开源协议发布。