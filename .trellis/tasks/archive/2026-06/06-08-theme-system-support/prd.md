# Theme System Support

## Goal

为 SubPilot 添加主题系统，让用户可以在 light/dark 主题间切换，主题偏好持久化到 localStorage，并支持系统偏好自动跟随。

## What I already know

* 项目已使用 shadcn/ui + Tailwind CSS v4，CSS 变量体系完整
* `index.css` 已定义 `:root`（light）和 `.dark`（dark）两套 oklch 变量
* 使用 `@custom-variant dark (&:is(.dark *))` 模式 — 通过 `<html class="dark">` 切换
- 目前没有主题切换 UI、Provider 或 localStorage 持久化
* shadcn/ui base-nova 风格，components.json 配置 cssVariables: true

## Assumptions (temporary)

* MVP 只需支持 light/dark 双主题（不需要自定义颜色主题）
* 遵循 shadcn/ui 推荐的主题方案
* 主题切换 UI 放在 header 区域（AppLayout）

## Decisions

* **主题切换 UI**: Dropdown 菜单 — 点击图标展开 Light/Dark/System 三选项，带选中标记。理由：三态切换比循环 toggle 直观，比 segmented control 省 header 空间

* **过渡动画**: 无动画 — 即时切换，实现简单，避免全局 transition 性能问题

* **未来扩展**: 预留扩展点 — ThemeProvider 类型/接口设计上留出颜色主题扩展可能，但不实现

## Open Questions

_(none — all resolved)_

## Requirements (evolving)

* 提供 ThemeProvider 组件管理主题状态
* 支持 light / dark / system 三种模式
* 主题偏好持久化到 localStorage
* 页面加载时防止闪烁（FOUC）
* Header 中提供主题切换入口

## Acceptance Criteria (evolving)

* [ ] 用户可在 light/dark/system 间切换，UI 即时响应
* [ ] 刷新页面后主题偏好保持
* [ ] system 模式下跟随 OS 偏好变化
* [ ] 无 FOUC（页面加载闪烁）
* [ ] 现有组件在两种主题下均正常显示

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 自定义颜色主题（超出多色主题的范畴）
* 用户级主题偏好同步到后端
* 细粒度组件级主题覆盖

## Technical Notes

* 关键文件：`frontend/src/index.css`（CSS 变量定义）、`frontend/src/App.tsx`（Provider 注入点）、`frontend/src/components/AppLayout.tsx`（切换 UI 位置）
* shadcn/ui 官方推荐使用 next-themes（React），但此项目非 Next.js，需确认兼容性或自行实现
* `@custom-variant dark` 使用 `.dark` class，与 shadcn/ui 标准模式一致
