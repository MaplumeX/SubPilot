# Design: Full currency support from exchange-rate source

## Overview

扩展 `SUPPORTED_CURRENCIES` 至 Frankfurter 当前 30 种法定货币；前后端静态镜像；选择器用现有 Select + `Intl.DisplayNames` 标签；汇率抓取逻辑不变，仅 `to=` 列表变长。

## Architecture / Boundaries

```
[Frontend Select] --static codes--> currencies.ts (mirror)
        | write currency / base_currency
        v
[API validators] --import--> app.currencies.SUPPORTED_CURRENCIES  (authority)
        |
        v
[exchange_rate.fetch] --to=SUPPORTED-{USD}--> Frankfurter
        |
        v
[exchange_rates table] --> get_rate() --> stats / converted_price / forecast
```

- **权威集合**：仅后端 `SUPPORTED_CURRENCIES` 用于写入校验与抓取范围。
- **前端镜像**：只服务 UI 选项；非法值仍由 API 拒绝。
- **不新增** currencies 列表 API、不动态同步 Frankfurter `/v1/currencies`。

## Data / Contracts

### Backend constant

```python
# backend/app/currencies.py
# Keep in sync with Frankfurter /v1/currencies and frontend/src/lib/currencies.ts
SUPPORTED_CURRENCIES = {
    "AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD",
    "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK",
    "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
}
```

Optional: export sorted tuple for stable ordering in tests/docs.

### Unchanged API shapes

| Endpoint / field | Behavior change |
|------------------|-----------------|
| `POST/PATCH` subscription `currency` | Accept any of 30; reject others → 422 |
| `PATCH /auth/me/base-currency` | Accept any of 30; reject others → 400 |
| stats / list / forecast | Same fields; rates may cover more pairs |

No response schema changes.

### Frontend

- `frontend/src/lib/currencies.ts`：
  - `SUPPORTED_CURRENCIES: readonly string[]`（排序后的 30 码，与后端一致）
  - `currencyLabel(code: string, locale: string): string` → `Intl.DisplayNames(locale, { type: "currency" }).of(code)` + 代码，失败回退为 code
- `SubscriptionForm` / `SettingsPage`：从该模块导入，去掉本地 5 项列表与 `t("subscriptionForm.currencies.*")`
- 可删除 en/zh-CN 中仅被选择器使用的 `subscriptionForm.currencies` 块（确认无其他引用后）

### Display format

推荐标签：`{localizedName} ({CODE})`  
例：`zh-CN` → `港元 (HKD)`；`en` → `Hong Kong Dollar (HKD)`。  
金额展示继续 `Intl.NumberFormat(locale, { style: "currency", currency })`。

## Exchange rate impact

- 现逻辑已按 `SUPPORTED_CURRENCIES - {USD}` 拼 `to`；扩集后自动覆盖。
- 交叉 pairs：30×29 = 870/日 upsert；SQLite 可接受。
- 若 Frankfurter 某次响应缺少部分币种：仅对返回的 keys 建交叉表；缺失对仍走 `get_rate` 1:1 警告（既有行为）。
- **不**改变 1:1 回退策略。

## Compatibility

- 存量用户 `base_currency` 与订阅 `currency` 均在旧 5 种内 → 无需数据迁移。
- 无 Alembic migration。
- i18n：移除死 key 不破坏运行时（若有遗留引用需先清）。

## Trade-offs

| 选择 | 代价 | 缓解 |
|------|------|------|
| 静态双份列表 | 可能漂移 | 两端注释 + 同 PR 改；可选后续加单测比对文档列表 |
| 无搜索 Select | 30 项滚动 | 与时区 Select 一致；搜索 out of scope |
| DisplayNames | 文案不可精调 | 可接受；符号不依赖选项文案 |
| 无 currencies API | FE 不自动跟 BE | 单体同发版 |

## Rollback

- 将 `SUPPORTED_CURRENCIES` 与前端镜像缩回 5 种并回滚选择器/i18n。
- 已写入的扩展币种订阅在回滚后会校验失败——若已生产写入扩展币，回滚前需数据清理（本阶段默认开发/自托管，接受此风险）。

## Testing strategy

- Backend：保留 `ZZZ` → 422；新增如 `HKD` 可通过 create（合同/集成测其一）。
- base-currency：`HKD` 200；`ZZZ` 400。
- 前端：typecheck；手动/现有路径确认两处 Select 项数与标签。
- 汇率：可 unit/mock 验证 `to=` 包含扩展码（若已有 exchange 测试则扩展；无则不强制新建重型 HTTP 测）。

## Out of design scope

- Combobox、动态同步、ISO 全量、改 1:1 策略、新 API。
