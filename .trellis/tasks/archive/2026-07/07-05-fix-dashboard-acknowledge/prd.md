# Fix Dashboard acknowledge 按钮刷新后重现 + toast 文案不一致

## Goal

让 Dashboard 的"确认已续费"按钮在用户点击后、当前周期内不再出现（刷新后也不重现），并让点击后的 toast 文案与后端实际行为一致。原本设计：点击确认已续费后，本周期不再提醒，下一周期才会再次提醒。

## Background

- 后端 `POST /subscriptions/{id}/acknowledge` 正确地把 `acknowledged_billing_date = next_billing_date`（`backend/app/routers/subscriptions.py:321-345`），且不会修改 `next_billing_date`。
- 通知扫描器 `backend/app/services/notifications/scanner.py:43-44` 正确地排除了已确认的订阅。
- 订阅列表页 `frontend/src/pages/SubscriptionsPage.tsx:411` 有客户端过滤 `acknowledged_billing_date === next_billing_date`，行为正常。
- **Bug A（逻辑）**：`GET /stats` 的 `due_soon` 查询（`backend/app/routers/subscriptions.py:259-272`）只按"3 天内到期"过滤，没有排除 `acknowledged_billing_date == next_billing_date` 的订阅。因此 Dashboard 刷新后，已确认的订阅又回到 `due_soon` 列表，按钮重现。
- **Bug B（文案）**：toast 文案说"下次将在 {{date}} 提醒你"/"We'll remind you about the next billing on {{date}}"，但 `{{date}}` 实际是当前周期的 `next_billing_date`（acknowledge 不推进周期）。语义对不上，用户会困惑。

## Requirements

### R1 — Dashboard due_soon 排除已确认订阅（后端，核心修复）

`GET /stats` 的 `due_soon` 查询必须排除当前周期已被确认的订阅，与通知扫描器保持一致：
- 条件：`acknowledged_billing_date IS NULL OR acknowledged_billing_date != next_billing_date`
- 与 `backend/app/services/notifications/scanner.py:43-44` 的过滤逻辑一致。
- 修复后：Dashboard 点击确认 → 刷新 → 按钮不再重现。

### R2 — Toast 文案与实际行为一致（前端 i18n）

acknowledge 只标记当前周期为已确认，不推进 `next_billing_date`。toast 文案需要反映这一点，避免误导用户以为下次提醒的日期就是 `{{date}}`。

采用方案 A：去掉 `{{date}}`，直接表达"本周期已确认/不再提醒"。
- 中文："好的，已记下，本周期不再提醒。"
- 英文："Got it. We won't remind you again this cycle."
- 同步更新 `frontend/src/pages/DashboardPage.tsx:127` 与 `frontend/src/pages/SubscriptionsPage.tsx:192` 的 `t()` 调用：去掉 `date` 插值参数。

## Acceptance Criteria

- [ ] AC1：在 Dashboard 点击某订阅"确认已续费"后，刷新页面（或重新进入 Dashboard），该订阅不再出现在 Due Soon 列表，按钮不再重现，直到 `next_billing_date` 推进到下一周期。
- [ ] AC2：`GET /stats` 的 `due_soon` 查询排除 `acknowledged_billing_date == next_billing_date` 的订阅。
- [ ] AC3：点击确认后的 toast 文案不再暗示"下次提醒日期是 {{date}}"，而是表达"本周期已确认/不再提醒"的语义。
- [ ] AC4：订阅列表页（SubscriptionsPage）行为不变，仍正常隐藏已确认订阅的按钮。
- [ ] AC5：`backend` lint/type-check 通过；`frontend` lint/type-check 通过。

## Out of Scope

- 不修改 acknowledge 端点本身（不推进 `next_billing_date`，保持当前产品语义）。
- 不改通知扫描器逻辑（它本来就对）。
- 不改 SubscriptionsPage 的客户端过滤逻辑。

