# Implement — converted_price display mismatch

## Execution Checklist

### 1. Backend: `converted_price` → single-cycle

- [ ] 1.1 `backend/app/routers/subscriptions.py`：6 处 `subscription.converted_price = round(monthly * rate, 2)` 改为 `round(subscription.price * rate, 2)`，删除这些处的 `monthly = _normalize_to_monthly(...)` 局部变量（若该处不再用于其他计算）
  - L165-168 (create)
  - L248-252 (list)
  - L316? (acknowledge)
  - L364 (get)
  - L424 (update)
  - 注意 stats 端点 L270-276 的 `converted_prices` 局部变量保留月均计算不变
- [ ] 1.2 验证 `_CYCLE_MULTIPLIER` SQL 表达式和 `sort_by=converted_price` 排序逻辑不变

### 2. Backend: `monthly_prices` 字段

- [ ] 2.1 `backend/app/schemas/subscription.py`：`SubscriptionStats` 新增 `monthly_prices: list[SubscriptionBrief] = []`
- [ ] 2.2 `backend/app/routers/subscriptions.py` `get_stats`：把现有 `converted_prices` 局部变量（L270-276）映射进响应 `monthly_prices=[SubscriptionBrief(name=n, amount=round(p, 2)) for n, p in sorted_prices]`
- [ ] 2.3 保留 `most_expensive`/`cheapest`/`top3_percentage` 现有逻辑不变

### 3. Backend tests

- [ ] 3.1 `backend/tests/test_contracts.py`：新增测试断言 `converted_price` 口径为 `round(price * rate, 2)`（单周期，非月均）
  - 由于 `converted_price` 在路由内联计算、无独立函数，提取一个纯函数 `_converted_price(price: float, rate: float) -> float` 供测试，路由调用它
  - 测试用例：年付 120 / rate 7.2 → 864.0；月付 10 / rate 7.2 → 72.0
- [ ] 3.2 运行 `cd backend && .venv/bin/python -m pytest -q` 全绿

### 4. Frontend: types

- [ ] 4.1 `frontend/src/api/types.ts`：`SubscriptionStats` 新增 `monthly_prices: SubscriptionBrief[]`

### 5. Frontend: StatisticsPage Top 5

- [ ] 5.1 `frontend/src/pages/StatisticsPage.tsx` L111-115：改为从 `stats.monthly_prices` 取 Top 5
  ```ts
  const topSubs: TopSubData[] = (stats?.monthly_prices ?? [])
    .slice(0, 5)
    .map((s) => ({ name: s.name, cost: s.amount }));
  ```
- [ ] 5.2 移除不再需要的 `subscriptions` filter/sort 块（若 `subscriptions` 在该文件其他地方不再使用则连 `listSubscriptions` import 一起清理）

### 6. Validation

- [ ] 6.1 后端测试：`cd backend && .venv/bin/python -m pytest -q`
- [ ] 6.2 前端类型：`cd frontend && npm run typecheck`（或 `npx tsc --noEmit`）
- [ ] 6.3 前端 lint/build：`cd frontend && npm run build`
- [ ] 6.4 手动验证（本地起服务）：
  - 年付 USD 120、base=CNY → 列表/卡片显示 `USD 120.00 (~¥864.00)`
  - 统计页 Top 5 仍按月均排序

## Validation Commands

```bash
cd backend && .venv/bin/python -m pytest -q
cd frontend && npm run typecheck
cd frontend && npm run build
```

## Rollback Points

- 每个步骤完成后可单独 commit；若前端类型报错，revert step 4-5。
- 全部 revert 单 commit 即可恢复，无数据迁移。