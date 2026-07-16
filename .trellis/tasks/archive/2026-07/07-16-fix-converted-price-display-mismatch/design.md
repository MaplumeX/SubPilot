# Design — converted_price display mismatch

## Context

`converted_price` is a computed (non-DB) field on `SubscriptionResponse`, set per-endpoint in `backend/app/routers/subscriptions.py`. It is currently `round(monthly * rate, 2)` everywhere, where `monthly = _normalize_to_monthly(price, cycle_count, cycle_unit)`.

Two consumers need different semantics:

| Consumer | Needed semantics | Current | Correct? |
|---|---|---|---|
| Subscription list/card/detail — "原价旁转换价" | `price * rate` (single cycle) | `monthly * rate` | ❌ |
| Statistics Top 5 — "月均最贵" | `monthly * rate` | `monthly * rate` | ✅ |
| `sort_by=converted_price` SQL order key | `monthly * rate` (月均排序合理) | `_CYCLE_MULTIPLIER * rate_expr` (月均) | ✅ |

## Decision

Split into two fields:

1. **`converted_price`** → redefined to single-cycle: `round(price * rate, 2)`. Used by subscription list/card/detail UI.
2. **`monthly_prices`** (new) → `list[{name, amount}]` where `amount = round(monthly * rate, 2)`. Added to `SubscriptionStats` only. Used by Statistics Top 5.

### Why not reuse `most_expensive`/`cheapest`

`get_stats` already computes a local `converted_prices: list[tuple[str, float]]` (L270-276) with月均 values and derives `most_expensive`/`cheapest`/`top3_percentage` from it. We just expose that same local list as `monthly_prices` — no new computation, single source of truth.

## Changes

### Backend

**`backend/app/schemas/subscription.py`**

- `SubscriptionStats` gains:
  ```python
  monthly_prices: list[SubscriptionBrief] = []
  ```
  Reuse `SubscriptionBrief` (`{name, amount}`) — same shape as `most_expensive`/`cheapest`.

**`backend/app/routers/subscriptions.py`**

- 6 赋值点（create/list/get/update/acknowledge/stats）改为单周期：
  ```python
  rate = get_rate(db, subscription.currency, base)
  subscription.converted_price = round(subscription.price * rate, 2)
  ```
  删除这些处的 `_normalize_to_monthly` 调用（monthly 仅留给 stats 内部聚合）。
- `get_stats`：把现有 `converted_prices` 局部变量映射成 `monthly_prices` 响应字段：
  ```python
  monthly_prices=[{"name": n, "amount": round(p, 2)} for n, p in sorted_prices]
  ```
  保留 `most_expensive`/`cheapest`/`top3_percentage` 现有逻辑不变。
- 排序键 `_CYCLE_MULTIPLIER * rate_expr` 保留不变。

**`backend/tests/test_contracts.py`**

- 新增 `ConvertedPriceTests`：
  - 直接测试 `converted_price` 计算函数。由于当前 `converted_price` 是在路由函数内联计算的（无独立函数），测试通过构造一个最小 helper 或直接断言路由返回值。
  - 考虑到现有测试都是纯函数测试（无 DB fixture），新增一个可测的纯函数 `_converted_price(price, rate) -> float`（或直接断言 `round(price * rate, 2)` 表达式）以保持风格一致。
- 新增 `MonthlyPricesTests`：
  - `get_stats` 的 `monthly_prices` 暴露测试（需 DB，见下方测试策略）。

> **测试策略**：现有测试基建是纯 `unittest` + 无 DB fixture。端点级测试需要 test client + DB。检查是否有现成 conftest/fixture。
> 若无 DB 测试基建，则：
> - 后端：新增纯函数测试断言 `converted_price` 表达式；端点级用手动验证 + 实现时本地起服务验证。
> - 不为本任务引入全新 DB fixture 基建（超出范围）。

### Frontend

**`frontend/src/api/types.ts`**

- `SubscriptionStats` 增加字段：
  ```ts
  monthly_prices: SubscriptionBrief[];
  ```

**`frontend/src/pages/StatisticsPage.tsx`** (L111-115)

- 从 `subscriptions[].converted_price` 推导改为从 `stats.monthly_prices` 取：
  ```ts
  const topSubs: TopSubData[] = (stats?.monthly_prices ?? [])
    .slice(0, 5)
    .map((s) => ({ name: s.name, cost: s.amount }));
  ```
- 移除对 `subscriptions` 的 `converted_price` 依赖（该 filter/sort 块）。

**`SubscriptionsPage.tsx` / `SubscriptionCard.tsx`**

- 无改动。`converted_price` 口径改后，同样的 JSX `(~{...format(sub.converted_price)})` 自动显示正确的单周期转换价。

## Data Flow

```
DB price/currency/cycle → get_rate → converted_price = price * rate ──► Subscription list/card UI
                          └────────► _normalize_to_monthly × rate ──► stats.monthly_prices ──► Statistics Top 5
```

## Compatibility / Migration

- `converted_price` 是响应字段，无 DB 列、无 Alembic 迁移。
- 前端 `Subscription` 类型不变（`converted_price: number | null` 保留）。
- `SubscriptionStats` 新增 `monthly_prices` 字段：后端默认 `[]`，前端用 `stats?.monthly_prices ?? []` 兜底，向后兼容。
- 无 breaking change 对外部 API 调用者（字段语义变化但类型不变；`monthly_prices` 是纯新增）。

## Risks / Rollback

- 风险：`converted_price` 语义变化对任何未发现的外部消费者有影响。已 grep 确认仅 3 处前端消费（SubscriptionsPage、SubscriptionCard、StatisticsPage），全部覆盖。
- 回滚：revert 单 commit 即可，无数据迁移。