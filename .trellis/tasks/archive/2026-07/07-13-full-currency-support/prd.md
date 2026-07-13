# Full currency support from exchange-rate source

## Goal

将 SubPilot 的可用货币从当前 5 种白名单，扩展为 **Frankfurter（ECB）实际支持、可完成汇率换算的全部货币**，使订阅原币种与用户基准货币都能覆盖这些币种，且统计/列表换算仍可信。

## Background

- 当前白名单：`backend/app/currencies.py` → `{CNY, USD, EUR, GBP, JPY}`。
- 校验：`SubscriptionCreate/Update.currency` 与 `PATCH /auth/me/base-currency` 均校验 `SUPPORTED_CURRENCIES`。
- 汇率：`exchange_rate.py` 请求 Frankfurter `latest?from=USD&to=<SUPPORTED - USD>`，交叉计算；无汇率时 `get_rate` **1:1 回退**。
- 前端：`SubscriptionForm`、`SettingsPage` 各硬编码 5 币种；i18n `subscriptionForm.currencies.*` 仅 5 条。
- Frankfurter `/v1/currencies`（2026-07-13）共 30 种：
  `AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR`。
- 既有：用户级 `base_currency`、无汇率 1:1、无历史汇率 UI。

## Product Decisions

| 决策 | 选择 |
|------|------|
| 支持范围 | 方案 B：Frankfurter 可换算全集（30） |
| 列表来源 | A：后端/前端静态常量，不动态拉 `/v1/currencies` |
| 选择器 UX | A：继续现有 Select（约 30 项滚动） |
| 展示名 | B：`Intl.DisplayNames` + ISO 代码；金额符号仍用 `NumberFormat` |
| 前后端同步 | A：前端静态镜像，无新 currencies API |

## Requirements

- R1: 后端 `SUPPORTED_CURRENCIES` 静态扩展为上述 30 种，作为校验与汇率抓取的唯一权威集合。
- R2: 订阅原币种与用户基准货币使用同一支持集合。
- R3: 汇率抓取对支持集合内全部非 USD 货币请求并缓存交叉汇率；同币种为 1.0。
- R4: 前端订阅表单与 Settings 基准货币 Select 展示完整 30 种；共用单一前端常量模块。
- R5: 选择器标签用 `Intl.DisplayNames`（随 UI locale）+ 代码；不再依赖手写 `subscriptionForm.currencies.*`。
- R6: stats / list `converted_price` / forecast 等换算语义不变。
- R7: 集合外代码 API 仍拒绝（422/400），不静默落入 1:1。
- R8: 覆盖测试：至少新增/更新对「扩展币种可写、非法币种仍拒」的校验用例。

## Acceptance Criteria

- [x] AC1: 可将订阅币种设为集合内任意代码（如 HKD、KRW、SGD），创建/更新成功。
- [x] AC2: 可将基准货币设为集合内任意代码；切换后统计与列表换算按新基准显示。
- [x] AC3: 集合外代码（如 `ZZZ`）创建订阅或改基准货币仍失败。
- [x] AC4: 启动/日更汇率任务对支持集合内非 USD 全部请求；异币种在有数据时不因白名单过窄缺率。
- [x] AC5: 前端两处 Select 可见完整 30 种；en / zh-CN 下展示名可读（DisplayNames + code）。
- [x] AC6: 原 5 币种行为与换算无回归。
- [x] AC7: 相关后端校验测试通过；前端 typecheck/lint 通过。

## Out of Scope

- ISO 4217 全量（含 Frankfurter 不支持币种）
- 加密货币 / 金属 / 非法定记账单位
- 历史汇率趋势、手动刷新汇率
- 改变无汇率 1:1 回退策略
- 可搜索 Combobox、常用币置顶
- 新 `GET /currencies`（或 bootstrap 附带列表）API
- 多基准货币、按订阅覆盖基准

## Constraints

- 单体仓同发版：前后端静态列表变更必须同 PR。
- 不改 DB schema（currency 已是 `String(3)`；无迁移除非发现硬约束）。
- 保持现有错误语义：订阅 currency 校验 422；base-currency 不支持为 400。

## Technical Notes

- 后端：`backend/app/currencies.py`、`schemas/subscription.py`、`routers/auth.py`、`services/exchange_rate.py`
- 前端：`SubscriptionForm.tsx`、`SettingsPage.tsx`、新建 `frontend/src/lib/currencies.ts`（或等价）、`i18n` 清理无用 keys
- 测试：`backend/tests/test_contracts.py`（已有 `currency="ZZZ"` 拒绝）
- 交叉汇率对数：30×29 = 870 pairs/日（可接受）

## Definition of Done

- AC1–AC7 满足
- `design.md` / `implement.md` 已执行完毕
- 相关 spec 在收尾阶段按需更新
- 用户审阅后提交
