# Support Logo Display for Subscription Entries

## Goal

为订阅条目添加 logo 显示，支持搜索、上传、链接 3 种方式获取 logo，提升订阅列表的视觉辨识度和用户体验。

## Requirements

* Subscription 模型新增 `logo_url` 字段（String, nullable）
* 后端新增文件上传 API（`POST /api/v1/subscriptions/upload-logo`），保存到 `static/logos/`，返回 URL
* 前端表单中提供三种方式设置 logo：
  1. **搜索** — 用户输入域名，通过 Google Favicon API 获取 logo（`https://www.google.com/s2/favicons?domain={domain}&sz=64`）
  2. **上传** — 本地上传图片（JPG/PNG/SVG/GIF, ≤2MB），保存到后端 `static/logos/`
  3. **链接** — 手动输入图片 URL
* 订阅列表 Name 列前显示 28×28 圆形 Avatar，无 logo 时显示首字母
* Dashboard Due Soon 区域也显示 logo
* 编辑订阅时支持修改/移除 logo
* 图片加载失败时 fallback 到首字母
* 删除订阅时清理对应上传文件

## Acceptance Criteria

* [ ] 数据库 migration 新增 `logo_url` 字段
* [ ] 表单中提供三种方式设置 logo，切换无冲突
* [ ] 订阅列表每行显示圆形 logo/首字母
* [ ] Dashboard Due Soon 显示 logo
* [ ] 无效文件格式/超限大小有错误提示
* [ ] 图片加载失败 fallback 到首字母
* [ ] 删除订阅时清理对应上传文件

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Alembic migration created
* Docs/notes updated if behavior changes

## Technical Approach

### 数据层
* 新增 Alembic migration 添加 `logo_url` 列（String, nullable）
* Schema 新增 `logo_url` 可选字段

### 后端 API
* 新增 `POST /api/v1/subscriptions/upload-logo` 端点
  * 接受 `UploadFile`，校验格式（JPG/PNG/SVG/GIF）和大小（≤2MB）
  * 保存到 `static/logos/{uuid}.{ext}`
  * 返回 `{ "logo_url": "/static/logos/{uuid}.{ext}" }`
* `main.py` mount `StaticFiles(directory="static")` 提供文件访问
* 删除订阅时检查 `logo_url` 是否为本地上传文件，是则删除文件

### 前端
* 安装 shadcn Avatar 组件
* SubscriptionForm 中实现 Tabs 切换三种方式（搜索/上传/链接）
  * 搜索 tab：输入域名 → 预览 Google Favicon → 确认
  * 上传 tab：文件选择 → 上传 → 预览
  * 链接 tab：输入 URL → 预览
* SubscriptionsPage：Name 列前添加 Avatar 组件
* DashboardPage：Due Soon 区域添加 Avatar

## Decision (ADR-lite)

* **存储策略**: 仅存 URL — 数据库存 `logo_url` 字符串，上传文件保存到本地 `static/logos/` 并生成 URL。与 SQLite + 本地部署的项目规模匹配。
* **搜索来源**: Google Favicon API — 免费、无需 key、实现最简。
* **展示方式**: 左侧圆形小头像（28×28），无 logo 显示首字母 fallback。
* **文件限制**: JPG/PNG/SVG/GIF，≤2MB。

## Out of Scope

* 图片裁剪/编辑功能
* 预设域名映射表
* 除 Google Favicon 外的第三方 logo 搜索 API
* 对象存储服务（S3/R2）

## Technical Notes

* 模型: `backend/app/models/subscription.py`
* API: `backend/app/routers/subscriptions.py`
* Schema: `backend/app/schemas/subscription.py`
* 前端表单: `frontend/src/components/SubscriptionForm.tsx`
* 前端列表: `frontend/src/pages/SubscriptionsPage.tsx`
* 前端 Dashboard: `frontend/src/pages/DashboardPage.tsx`
* 前端类型: `frontend/src/api/types.ts`
* 前端 API: `frontend/src/api/subscriptions.ts`
* `python-multipart` 已在 `backend/requirements.txt` 中
