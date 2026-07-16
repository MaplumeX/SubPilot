# Fix custom cycle stats normalization

## Goal

`_normalize_to_monthly` 和 `_CYCLE_MULTIPLIER` 把 `cycle_count` 当成了"扣款频率倍数"（price × count），但 `cycle_count` 的实际语义是"周期跨度"（每 N 个单位扣一次 price）。正确的月均换算应该**除以** `cycle_count`，而不是乘以。本任务修正这两处金额换算逻辑，使自定义周期（如"每 2 周"、"每 6 个月"、"每 3 个月/季度"）的统计与列表 `converted_price` 正确。

## Background

- 前端预设 `quarterly = { cycle_count: 3, cycle_unit: "month" }` → 语义"每 3 个月扣一次 price"。
- 假设 price=100，quarterly 的正确月均 = 100 / 3 ≈ 33.33（年扣 4 次 = 400/年）。
- 当前代码算出 = 100 × 3 = 300，差 9 倍。
- `cycle_count = 1` 时乘除等价，所以 weekly/monthly/yearly 这些预设看起来正常；一旦 `cycle_count > 1` 就全部算错。
- 该错误源自 06-08-customizable-billing-cycle 的原 PRD "Normalization formula" 章节，公式从设计阶段就写反了。

## Scope

### In scope
- `backend/app/routers/subscriptions.py`:
  - `_normalize_to_monthly`（L58-67）：四个分支的 `cycle_count` 从乘法改为除法。
  - `_CYCLE_MULTIPLIER` SQL case 表达式（L46-51）：同步修正，保证列表 `sort_by=converted_price` 的排序键与 Python 换算一致。

### Out of scope
- `backend/app/services/forecast.py`：使用每次扣款实际金额 `price * rate`，不涉及月均换算，不受此 bug 影响。
- `backend/app/services/renewal.py::advance_next_billing_date`：用 `cycle_count` 做日期加法，正确。
- 前端：仅消费后端 `converted_price` / `total_monthly` 等字段，不自行做周期换算，无需改动。
- 数据迁移：纯计算逻辑修正，不涉及 schema 变更。

## Requirements

1. `_normalize_to_monthly` 正确公式：
   - day: `price / cycle_count * 365 / 12`
   - week: `price / cycle_count * 52 / 12`
   - month: `price / cycle_count`
   - year: `price / cycle_count / 12`
2. `_CYCLE_MULTIPLIER` SQL case 表达式同步修正为除法版本，与 `_normalize_to_monthly` 数值一致。
3. 现有 `cycle_count = 1` 的订阅（weekly/monthly/yearly 预设）结果不变——这是回归保护点。
4. 新增单元测试覆盖 `cycle_count > 1` 的场景（至少覆盖 month 和 year 两个分支，quarterly 预设必须正确）。

## Acceptance Criteria

- [ ] `_normalize_to_monthly(100, 3, month) == 33.33...`（quarterly 正确）
- [ ] `_normalize_to_monthly(100, 1, month) == 100`（monthly 预设回归不变）
- [ ] `_normalize_to_monthly(1200, 1, year) == 100`（yearly 预设回归不变）
- [ ] `_normalize_to_monthly(100, 2, week) == 100/2 * 52/12`（每 2 周正确）
- [ ] `_CYCLE_MULTIPLIER` SQL 表达式与 `_normalize_to_monthly` 数值一致
- [ ] `backend/tests/` 新增测试覆盖 `cycle_count > 1` 场景并全部通过
- [ ] `cd backend && ruff check . && python -m pytest` 绿
- [ ] `cd frontend && pnpm tsc --noEmit` 绿（验证无类型回归）

## Definition of Done

- 代码改动仅限 `backend/app/routers/subscriptions.py` 和 `backend/tests/`
- Lint / typecheck / tests 全绿
- 不涉及 DB 迁移、不涉及前端改动

## Notes

- 这是 06-08-customizable-billing-cycle 设计阶段遗留的公式错误，修正后 spec 中引用该公式的章节也需要同步更新（Phase 3.3 spec update 处理）。