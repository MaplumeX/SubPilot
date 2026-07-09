# 订阅表格补上已确认续费状态

## Goal

在订阅管理的**表格视图**中，用户点击「确认已续费」后，能清楚看到该条目当前周期已确认的状态，而不是按钮消失后看起来像普通即将到期。

## Background (confirmed from code)

- 后端 `POST /subscriptions/{id}/acknowledge` 将 `acknowledged_billing_date = next_billing_date`，不推进 `next_billing_date`。
- 已确认判定：`acknowledged_billing_date != null && acknowledged_billing_date === next_billing_date`。
- **卡片视图**（`SubscriptionCard.tsx:34-54`）已正确展示：
  - due soon 且未确认 → `pending` badge + 到期文案
  - due soon 且已确认 → `secondary` badge + `subscriptions.acknowledged`（「已确认」）
  - 确认按钮仅在 `canAcknowledge = dueSoon && !acknowledged` 时显示
- **表格视图**（`SubscriptionsPage.tsx:352-357, 411-420`）不完整：
  - 名称列：只要 `isDueSoon` 就固定显示 `pending` 到期 badge，**不区分已确认**
  - 操作列：已确认后隐藏「确认已续费」按钮，但**无替代状态标识**
  - 确认后本地 state 会更新 `acknowledged_billing_date`（`handleAcknowledge`），缺的是展示层
- i18n 已有 `subscriptions.acknowledged` / `acknowledgedHint`，表格未使用。

## Decision

- **D-1** 名称列 due-soon badge 与卡片对齐：未确认 → pending + 到期文案；已确认 → secondary +「已确认」。替换，不额外并列显示。

## Requirements

### R1 — 表格名称列 badge 区分已确认（核心）

当订阅处于 due-soon 窗口时：
- **未确认**：保持现有 `pending` badge + `formatDueLabel(...)`
- **已确认**：改为 `secondary` badge + `t("subscriptions.acknowledged")`（与卡片一致，D-1）

实现位置：`frontend/src/pages/SubscriptionsPage.tsx` 表格名称列 badge 分支（约 352-357 行）。

### R2 — 确认后即时反馈

点击「确认已续费」后，无需刷新：名称列 badge 立即切到「已确认」，按钮消失（现有 `handleAcknowledge` 状态更新已支持，只需展示跟随）。

### R3 — 范围边界

- 仅改**表格视图**展示逻辑；卡片视图行为保持不变。
- Dashboard 仍按既有逻辑从 Due Soon 移除条目（本任务不做 Dashboard 已确认列表）。
- 不改后端 acknowledge 语义。
- 不新增列、不改操作列布局；不强制使用 `acknowledgedHint`。

## Acceptance Criteria

- [ ] AC1：表格视图中，due-soon 且未确认的订阅：名称列显示 pending 到期 badge，操作列有「确认已续费」按钮。
- [ ] AC2：点击确认后（不刷新）：按钮消失，名称列 badge 变为「已确认」（secondary），且不再显示 pending 到期文案。
- [ ] AC3：刷新页面后，已确认且仍在 due-soon 窗口的订阅仍显示「已确认」badge，无确认按钮。
- [ ] AC4：卡片视图、Dashboard、后端行为不变。
- [ ] AC5：`frontend` type-check / lint 通过。

## Out of Scope

- Dashboard 确认后保留「已确认」条目
- 新增「已确认」专用列或操作列文案块
- 修改 acknowledge 后端或推进 `next_billing_date`
- 使用 `acknowledgedHint` 的额外 UI（除非后续需要 tooltip）
