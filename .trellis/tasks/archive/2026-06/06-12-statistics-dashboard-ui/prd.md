# Statistics Dashboard UI

## Goal

为 SubPilot 添加独立的统计页面，包含分类花费分布饼图、月度花费趋势投影（前向12个月）和 Top N 订阅排行，让用户获得有意义的支出洞察。

## Requirements

* 新增 `/statistics` 路由和 StatisticsPage 页面组件
* 导航栏（AppLayout）添加"统计"入口
* 三张数据可视化图表：
  1. **分类花费分布** — 环形图（PieChart），展示 by_category 各分类占比
  2. **月度花费趋势** — 柱状图（BarChart），基于当前订阅 next_billing_date + cycle 投影未来12个月每月总花费
  3. **Top N 订阅排行** — 水平柱状图/列表，展示月费最高的前5个订阅
* i18n 支持（中英文）
* 空状态处理（无订阅时提示添加）
* 使用已有 `GET /api/v1/subscriptions/stats` 的 `by_category` 数据（饼图），月度投影和 Top N 使用 `listSubscriptions()` 前端计算

## Acceptance Criteria

* [ ] 用户能从导航栏点击进入统计页
* [ ] 分类花费分布环形图正确显示各分类占比，hover 显示金额
* [ ] 月度趋势柱状图基于当前订阅前向投影12个月
* [ ] Top 5 订阅排行按月费降序展示
* [ ] 无订阅时显示空状态提示
* [ ] 中英文 i18n 完整
* [ ] lint / typecheck 通过

## Definition of Done

* Lint / typecheck / CI green
* 中英文翻译完整

## Technical Approach

### 前端

1. 新建 `StatisticsPage.tsx`，作为 `/statistics` 路由页面
2. 调用 `getStats()` 获取 `by_category` 数据 → 饼图
3. 调用 `listSubscriptions()` 获取全部订阅 → 前端计算：
   - 月度投影：遍历每个订阅的 next_billing_date 和 cycle，推算未来12个月命中哪些月
   - Top N：按 converted_price 降序取前5
4. 在 `AppLayout.tsx` 导航栏添加"统计"按钮
5. 在 `App.tsx` Routes 中添加 `/statistics` 路由
6. 添加 i18n keys 到 `en.json` 和 `zh-CN.json`

### 后端

* 不需要新增 API。现有 `getStats()` 已提供 `by_category`，`listSubscriptions()` 已提供完整订阅列表含 `converted_price`

### 图表库

* 使用已安装的 Recharts v3（PieChart/Pie/Cell + BarChart/Bar）

## Decision (ADR-lite)

**Context**: 月度趋势数据目前系统无历史花费记录，只有当前订阅状态  
**Decision**: 使用前向投影（基于 next_billing_date + cycle 推算未来12个月花费），不引入历史支付表  
**Consequences**: 趋势图反映的是"如果什么都不变，未来会怎样"而非"过去花了多少"。如需真实历史，后续需新增 payment_history 表 + migration

## Out of Scope

* 修改现有 Dashboard 页面
* 真实历史花费记录 / payment_history 表
* 导出 PDF/CSV
* 预算目标 / 预警
* 日历视图

## Technical Notes

* 后端 stats 端点: `backend/app/routers/subscriptions.py:122-166` (by_category 字段已有但前端未用)
* 后端 schema: `backend/app/schemas/subscription.py:58-64` (SubscriptionStats)
* 现有 Dashboard: `frontend/src/pages/DashboardPage.tsx`
* 前端路由: `frontend/src/App.tsx`
* 导航: `frontend/src/components/AppLayout.tsx`
* 类型: `frontend/src/api/types.ts` (SubscriptionStats, Subscription)
* API 层: `frontend/src/api/subscriptions.ts`
* i18n: `frontend/src/i18n/en.json`, `frontend/src/i18n/zh-CN.json`
* Recharts v3.8.1 已安装
