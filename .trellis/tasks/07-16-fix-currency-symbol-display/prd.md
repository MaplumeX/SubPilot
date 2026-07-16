# Use locale-aware currency formatting for subscription prices

## Goal

订阅原币种价格当前在 4 处界面以裸代码 + 数字形式显示（如 `USD 9.99`），与换算价使用的 `Intl.NumberFormat` 货币格式（如 `~¥864.00`）风格不一致。本任务把原币种价也改为按 locale 本地化的货币格式（如 `$9.99` / `US$9.99` / `¥9.99`），使两类价格显示风格统一。

## Background

- 现状：`{sub.currency} {sub.price.toFixed(2)}` 硬编码于 SubscriptionCard、SubscriptionsPage（表格）、DashboardPage（due_soon 行）、CalendarPage（日历事件）。
- 换算价已用 `new Intl.NumberFormat(locale, { style: "currency", currency: baseCurrency }).format(...)`。
- 项目已支持 30 种货币（`frontend/src/lib/currencies.ts`），`Intl.NumberFormat` 对全部 code 均可格式化。
- locale 来源：组件中为 `i18n.language`（"zh-CN" / "en"）。

## Requirements

- R1：在 `frontend/src/lib/currencies.ts` 新增 `formatCurrency(amount: number, currency: string, locale: string): string`，内部用 `Intl.NumberFormat(locale, { style: "currency", currency })` 格式化；构造失败时回退为 `<currency> <amount.toFixed(2)>`（保持原显示，不抛错）。
- R2：替换以下 4 处原币种价显示为 `formatCurrency(sub.price, sub.currency, locale)`：
  - `frontend/src/components/SubscriptionCard.tsx:73`
  - `frontend/src/pages/SubscriptionsPage.tsx:367`
  - `frontend/src/pages/DashboardPage.tsx:199`
  - `frontend/src/pages/CalendarPage.tsx:467`
- R3：换算价（`converted_price`）显示保持现状不变（已用 `Intl.NumberFormat`）。
- R4：不改动后端、API、类型定义；纯前端显示层改动。
- R5：保持现有视觉风格（`font-variant-numeric tabular-nums` 等 className 不变，只换内容表达式）。

## Acceptance Criteria

- [ ] AC1：订阅管理表格视图价格列显示本地化货币符号（如 zh-CN 下 `US$9.99`、`¥120.00`；en 下 `$9.99`、`CN¥120.00`），不再出现裸 `USD`/`CNY` 代码前缀。
- [ ] AC2：订阅管理卡片视图价格行同 AC1。
- [ ] AC3：Dashboard "due soon" 行原币种价同 AC1。
- [ ] AC4：Calendar 日历事件弹窗原币种价同 AC1。
- [ ] AC5：换算价 `~¥864.00` 显示与改动前完全一致（未被破坏）。
- [ ] AC6：`formatCurrency` 对不支持的 currency code 不抛错，回退为 `<code> <amount>` 形式。
- [ ] AC7：`npm run lint` / `tsc` 无新增错误。

## Out of Scope

- 后端 `converted_price` 语义或汇率逻辑（上一任务已处理）。
- 新增货币或修改 `SUPPORTED_CURRENCIES`。
- 调整换算价的显示格式。

## Notes

- 轻量任务，PRD-only；实现为单函数 + 4 处调用点替换。
- `Intl.NumberFormat` 在 zh-CN 下对 USD 输出 `US$9.99`，在 en 下输出 `$9.99`；这是浏览器原生行为，无需自定义符号映射。