# Add i18n Support

## Goal

为 SubPilot 应用添加国际化(i18n)支持，使其能够支持多语言切换，首期至少支持英语(en)和简体中文(zh-CN)。

## What I already know

* 项目是 React 19 + Vite + TypeScript 前端 + FastAPI 后端的订阅管理应用
* 前端无任何 i18n 库，所有用户可见字符串硬编码在 JSX 中
* 后端有 5 个 HTTPException detail 字符串
* 默认货币是 CNY（人民币），暗示中文用户是重要目标群体
* DashboardPage 中 chart 使用硬编码 `"en-US"` locale
* 前端约 80+ 个硬编码字符串需要提取

### 前端硬编码字符串分布

| 文件 | 估算数量 | 示例 |
|------|---------|------|
| LoginPage.tsx | 8 | "Sign in to SubPilot", "Email", "Password" |
| RegisterPage.tsx | 11 | "Create your account", "Passwords do not match" |
| DashboardPage.tsx | 10+ | "Monthly Spend", "Active Subscriptions" + 硬编码 "en-US" |
| SubscriptionsPage.tsx | ~25 | 表头、分类名、状态名、周期名 |
| SubscriptionForm.tsx | ~20 | 标签、校验错误、选择项 |
| AppLayout.tsx | 4 | "SubPilot", "Dashboard", "Sign out" |
| routes.tsx | 1 | "Loading..." |

### 后端硬编码字符串

| 文件 | 数量 | 示例 |
|------|------|------|
| auth.py | 4 | "Email already registered", "Invalid credentials" |
| subscriptions.py | 1 | "Subscription not found" |

## Assumptions (temporary)

* MVP 先只做前端 i18n，后端 API 错误消息使用固定英文（前端可用 error code 映射到本地化消息）
* 默认语言可根据浏览器语言自动检测，同时提供手动切换
* 使用 react-i18next 作为 i18n 方案（React 生态最成熟的选择）

## Open Questions

1. ~~后端 API 错误消息是否也需要 i18n？~~ → 已决定：仅前端 i18n，前端映射显示
2. ~~语言切换 UI 放在哪里？~~ → 已决定：Settings 页面
3. ~~是否需要持久化语言偏好？~~ → 已决定：后端用户表存储
4. ~~除了 en 和 zh-CN，MVP 是否还要支持其他语言？~~ → 已决定：仅 en + zh-CN

## Requirements (evolving)

* 安装并配置 react-i18next + i18next
* 创建翻译文件结构（en.json, zh-CN.json）
* 提取所有前端硬编码字符串为 translation key
* 翻译为中文
* 新建 Settings 页面，包含语言切换选项
* 在 AppLayout 侧边栏添加 Settings 入口
* 修复 DashboardPage 中硬编码的 "en-US" locale 为动态 locale
* 修复货币显示格式随 locale 变化
* 后端 API 错误消息保持英文，前端通过 message 内容映射为本地化文本
* 数据库 user 表添加 locale 字段，Alembic 迁移
* 新增 API 端点更新用户 locale
* 前端登录后读取用户 locale 并应用

## Acceptance Criteria (evolving)

* [ ] 应用可切换 en / zh-CN 两种语言
* [ ] 所有前端用户可见字符串均已翻译
* [ ] 翻译 key 组织合理（按页面/功能命名空间分组）
* [ ] 日期/货币格式随 locale 变化
* [ ] 语言偏好持久化到后端用户表，跨设备同步
* [ ] 默认语言跟随浏览器语言

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 后端 API 错误消息不做 i18n，前端通过 message 内容映射为本地化文本
* RTL 布局支持
* SSR/SSG i18n（项目为纯 SPA）
* 翻译管理平台集成（Crowdin、Lokalise 等）

## Technical Notes

* 前端框架: React 19 + Vite + TypeScript
* 后端框架: FastAPI + SQLAlchemy
* UI 组件库: shadcn/ui
* 路由: React Router DOM v7
* 默认货币: CNY
