# 统计界面显示未来每月开销

## Goal

在统计界面用「实际扣款现金流」展示未来 12 个自然月的预计开销，并支持查看某月明细；同时用同一套算法修正 Dashboard「未来 30 天预估」，让两处数字口径一致。

## Background

- 入口：`frontend/src/pages/StatisticsPage.tsx`（分类饼图 + Top 5）
- 现有 `GET /subscriptions/stats` 的 `total_monthly` / `total_yearly` 是**周期归一化月均**，不是自然月真实扣款
- Dashboard `NextMonthProjection`（`DashboardPage.tsx`）用 `next_billing_date ∈ [today, today+30]` + **月均** `converted_price` 求和，对周付/日付不准
- 日历页只展示当前 `next_billing_date` 落在当月的订阅，不会多周期滚动
- 可复用：`backend/app/services/renewal.py::advance_next_billing_date`
- 换算：`get_rate(db, currency, base_currency)`；展示币种 = 用户 `base_currency`
- 前端已有 Recharts（饼图）；可加 BarChart

## Decisions

| 决策 | 选择 | 说明 |
|------|------|------|
| 开销口径 | 实际扣款现金流 | 单次金额 = `price × 汇率`（**不是**月均 `converted_price`） |
| 时间窗口 | 固定 12 个自然月（含当月） | 从 `today` 起投影；当月仅含剩余扣款 |
| 订阅纳入 | 仅 `active` + 尊重 `auto_renew` | `auto_renew=true` 滚满窗口；`false` 只计下一次且 `billing_date >= today` |
| 展示 | 柱状图 + 月明细 | 点柱 → 图下展开该月明细（名称、扣款日、金额） |
| Dashboard | 同一算法 | 「未来 30 天」改为滚动 30 天现金流合计，不再用月均 |

## Requirements

### R1 — 12 个月现金流预测（统计页）

- 展示当前自然月起连续 12 个月的预计开销（`base_currency`）
- 每月柱高 = 该月内所有投影扣款金额之和
- 可点选某月查看明细：订阅名称、扣款日期、换算后金额（同月多次扣款可多行）
- 空数据：无 active 可投影订阅时，与统计页现有空状态一致或图表区零状态文案

### R2 — 投影规则

- 纳入：`status=active` 且 `next_billing_date` 非空
- 从 `next_billing_date` 起，用与 `advance_next_billing_date` 相同的周期推进生成扣款日
- 仅计入 `billing_date >= today` 且落在窗口内的扣款
- 窗口结束日 = 第 12 个自然月的最后一天（月 0 = 当前月）
- `auto_renew=true`：持续推进直到超出窗口
- `auto_renew=false`：最多计入一次（`next_billing_date` 若 `>= today` 且在窗口内）
- `cancelled` / `trial` 不计入
- 不回溯窗口开始前已发生的扣款

### R3 — Dashboard 30 天预估

- 使用与 R2 相同的扣款投影规则
- 汇总 `today <= billing_date <= today+30` 的实际扣款金额
- 替换前端基于 `converted_price` 的本地估算
- 更新相关 i18n 副文案，避免仍暗示「仅看下次扣费日 + 月均」

### R4 — 工程与体验

- 文案 i18n：`statistics` + `dashboard` 命名空间，`zh-CN` 与 `en`
- 金额格式化与现有页一致（`Intl.NumberFormat` + `base_currency`）
- 后端静态子路径路由顺序：新 forecast 路由必须声明在 `/{subscription_id}` 之前

## Acceptance Criteria

- [ ] AC1: 统计页可见未来 12 个自然月的柱状图，月份标签与总额正确（含当月仅剩余扣款）
- [ ] AC2: 年付/季付只在对应扣款月产生峰值；月付在有扣款的月份计入全价（非 1/12）
- [ ] AC3: 周付/日付在同一自然月可出现多次扣款，月总额 = 各次之和
- [ ] AC4: `auto_renew=false` 的订阅在预测中最多出现一次
- [ ] AC5: 点击某月柱可看到该月明细（名称、日期、金额），金额之和等于该月柱值
- [ ] AC6: Dashboard「未来 30 天」数值与同一套现金流算法一致（含多周期订阅多次扣款）
- [ ] AC7: 金额均为用户 `base_currency` 换算后的值；无订阅/无投影时有合理空或零状态
- [ ] AC8: `zh-CN` / `en` 文案齐全，无硬编码用户可见字符串

## Out of Scope

- 可切换 3/6/12 月范围
- `trial` / `cancelled` 纳入预测
- 历史已发生扣款回溯 / 真实支付流水
- 日历页多周期滚动（可后续任务）
- 修改现有 `total_monthly` / `total_yearly` 语义

## Notes

- 明细交互默认：点击柱体 → 图表下方展开该月明细列表；再次点击可取消或切换月份
- 复杂任务：需 `design.md` + `implement.md` + jsonl 上下文后再 `task.py start`
