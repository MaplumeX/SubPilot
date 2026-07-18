# Show next renewal date in subscription management UI

## Goal

在订阅管理界面（表格视图 + 卡片视图）显式展示下次续费的具体日期，而不只是相对时间（如"3天后"），让用户一眼看到确切扣费日。

## Background

- 后端模型 `Subscription.next_billing_date`（`Date | None`）已存在，`SubscriptionResponse` 已暴露，前端类型 `Subscription.next_billing_date: string | null` 已就绪。**无需任何后端改动。**
- 当前前端两处视图仅通过 `formatDueLabel()`（`frontend/src/lib/due.ts`）显示相对时间：
  - 表格视图"下次扣费"列（`SubscriptionsPage.tsx`）：仅相对时间。
  - 卡片视图（`SubscriptionCard.tsx`）：仅在 `dueSoon` 时以 badge 显示相对时间；正文一行也只显示相对时间；非即将到期时无下次续费信息。
- `formatDueLabel` 在 `days <= 0`（已过期/今天）时统一返回"今天到期"。

## Requirements

1. **表格视图**（`SubscriptionsPage.tsx`）"下次扣费"列：显示**具体日期 + 相对时间**，格式为 `2026-07-21 (3天后)`。
   - 具体日期使用 `Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" })` 按 locale 格式化（与项目其他日期格式化方式一致）。
   - 相对时间复用 `formatDueLabel`。
   - `next_billing_date` 为 null 时显示 `-`。
2. **卡片视图**（`SubscriptionCard.tsx`）：正文始终显示一行下次续费信息，格式同表格（具体日期 + 相对时间）。
   - 不改变现有 `dueSoon` badge 的行为（仍仅即将到期时显示相对时间 badge）。
3. **格式约定**：`<具体日期> (<相对时间>)`，例如：
   - 未来：`2026-07-21 (3天后)` / `2026-07-21 (in 3 days)`
   - 今天/已过期：`2026-07-18 (今天到期)` / `2026-07-18 (due today)` —— 保持 `formatDueLabel` 现有语义不变。
4. **i18n**：无需新增 key——相对时间复用 `dashboard.dueInDays` / `dashboard.dueToday`，具体日期由 `Intl.DateTimeFormat` 本地化。
5. **范围限定**：仅改 `SubscriptionsPage.tsx`、`SubscriptionCard.tsx`；不改 `due.ts` 的 `formatDueLabel` 语义；不动后端；不动表单；不改 Dashboard/Calendar/Statistics 页面。

## Acceptance Criteria

- [ ] 表格视图"下次扣费"列对每条订阅显示 `具体日期 (相对时间)`；null 显示 `-`。
- [ ] 卡片视图正文对每条订阅显示同样格式的下次续费信息；非即将到期时也可见。
- [ ] 日期按当前 locale 格式化（中/英），相对时间部分与原 `formatDueLabel` 行为一致。
- [ ] `dueSoon` badge 行为不变。
- [ ] `npm run build`（前端）通过，无类型错误。
- [ ] 中/英两种语言下视觉检查通过（日期格式 + 相对时间文案正确）。

## Notes

- 轻量级任务，PRD-only，无需 `design.md` / `implement.md`。
- 实现时可在 `due.ts` 新增一个组合辅助函数（如 `formatNextBillingDate`），避免两处重复拼接逻辑；也可直接在两处内联。倾向新增辅助函数以复用。