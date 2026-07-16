# fix converted_price display mismatch in subscription UI

## Goal

`converted_price` 当前在后端所有端点统一按"月均基础币种价格"（`monthly * rate`）计算，但订阅管理页把它紧挨着单周期原价显示为 `USD 120.00 (~¥72.00)`，口径不一致造成误导（120 USD ≈ 864 CNY，72 只是月均）。本任务把 `converted_price` 语义改为"单周期原币种换算到基础币种的价格"（`price * rate`），并为统计页"Top 5 最贵订阅"提供独立的月均来源，使两个字段各司其职、显示语义自洽。

## Background

- 后端 6 处给 `converted_price` 赋值，全是 `round(monthly * rate, 2)`：
  - `backend/app/routers/subscriptions.py` L168 (create), L252 (list), L275 (stats 的 `converted_prices` 局部变量，未回写响应), L316? (acknowledge), L364 (get), L424 (update)
  - `_normalize_to_monthly` 月均换算逻辑正确，只是不该用于"原价旁转换价"显示
- 前端消费 `converted_price` 的位置：
  - `SubscriptionsPage.tsx` L368-370：原价旁转换价（需要单周期口径）
  - `SubscriptionCard.tsx` L74-76：同上
  - `StatisticsPage.tsx` L111-115：Top 5 最贵订阅排序（需要月均口径）
- 后端排序键 `_CYCLE_MULTIPLIER * rate_expr`（L232）已经是月均口径，用于 `sort_by=converted_price`，逻辑正确，保留不动。

## Requirements

### R1 — `converted_price` 语义改为单周期换算

- 所有给 `subscription.converted_price` 赋值处改为 `round(price * rate, 2)`，不再经过 `_normalize_to_monthly`。
- 涉及端点：create / list / get / update / acknowledge（stats 端点若也回写 `converted_price` 同步改）。
- `converted_price` 字段名与 `SubscriptionResponse` schema 不变，仅计算口径变化。
- 排序键 `_CYCLE_MULTIPLIER * rate_expr` 保留月均语义不变（排序"按价格"用月均合理）。

### R2 — 统计页 Top 5 改用独立月均来源

- 统计页"Top 5 最贵订阅"需要月均口径。`converted_price` 改为单周期后，此处不能再直接用它。
- 方案：后端 `SubscriptionStats` 新增 `monthly_prices: list[{name, amount}]`（或等价结构），由 `get_stats` 用 `_normalize_to_monthly * rate` 计算，前端 Top 5 改用此字段。
  - 复用 `get_stats` 已有的 `converted_prices` 局部变量（L270-276），只需把它暴露到响应 schema。
  - `most_expensive` / `cheapest` / `top3_percentage` 已基于同一个 `converted_prices` 月均列表计算，语义不变，继续保留。
- 前端 `StatisticsPage.tsx` L111-115 改从 `stats.monthly_prices` 取数据，不再从 `subscriptions[].converted_price` 推导。

### R3 — 测试覆盖

- 后端：补充/更新测试，验证
  - `converted_price == round(price * rate, 2)`（单周期，非月均）
  - `stats.monthly_prices` 返回月均值且与 `most_expensive`/`cheapest` 一致
- 前端：无需新增单测（项目目前无前端测试基建），靠手动/类型校验。

## Acceptance Criteria

- [ ] AC1：年订阅 `USD 120`（cycle=1 year），base=CNY，rate=7.2，列表/详情/卡片显示 `USD 120.00 (~¥864.00)`，不再显示 `~¥72.00`
- [ ] AC2：月订阅 `USD 10`（cycle=1 month），base=CNY，rate=7.2，显示 `USD 10.00 (~¥72.00)`
- [ ] AC3：`sort_by=converted_price` 排序结果与改动前一致（仍按月均排序）
- [ ] AC4：统计页 Top 5 仍按月均排序（年付 120 USD 排在月付 15 USD 之后）
- [ ] AC5：`SubscriptionStats.monthly_prices` 字段存在且返回月均值；`most_expensive`/`cheapest`/`top3_percentage` 数值与改动前一致
- [ ] AC6：后端测试通过，覆盖 AC1/AC2 的 `converted_price` 断言与 AC4/AC5 的 `monthly_prices` 断言

## Out of Scope

- 前端不做新增月均显示文案（如 `~¥72.00/月` 标注）——字段语义对齐后即自洽。
- 不改 `_normalize_to_monthly` 或 `_CYCLE_MULTIPLIER` 本身逻辑。
- 不动 forecast 模块（它本就用 `price * rate` 单周期口径，已正确）。
- 不动 `by_category` / `total_monthly` / `total_yearly` 等统计聚合（已是月均口径，正确）。

## Open Questions

（无）