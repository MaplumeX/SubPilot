# Add More Statistics Data to Dashboard

## Goal

扩充统计界面（StatisticsPage），在现有图表上方新增 4 个核心指标卡片，帮助用户快速了解订阅消费概况。

## What I already know

* 当前 StatisticsPage 包含 3 个板块：分类饼图（Category Distribution）、Top 5 订阅（Top 5 Subscriptions）、月度趋势柱状图（Monthly Trend）
* 后端仅有 `GET /api/v1/subscriptions/stats` 返回 `total_monthly`, `total_yearly`, `by_category`, `count`, `due_soon`
* 订阅模型有 `status`（active/cancelled/trial）、`price`、`currency`、`cycle_unit`、`cycle_count` 等字段
* 前端使用 Recharts + shadcn/ui，金额显示带 base_currency

## Decisions

* **数据来源**：仅基于现有订阅数据推算，不新增历史消费记录表
* **新增指标**：仅核心指标卡片（平均订阅费用、最贵订阅、最便宜订阅、消费集中度 Top3 占比）
* **卡片布局**：横排一行 4 卡片，紧凑风格，放在现有饼图上方
* **展示样式**：极简，金额+名称，无额外对比信息
* **空状态**：0 个订阅时隐藏整行卡片区域

## Requirements

* 在 StatisticsPage 顶部（现有饼图上方）新增核心指标卡片区域（横排一行 4 卡片）：
  - 平均订阅费用（月均每笔）
  - 最贵订阅（名称+金额，极简样式）
  - 最便宜订阅（名称+金额，极简样式）
  - 消费集中度（Top 3 占总支出百分比）
* 后端扩展 `SubscriptionStats`，新增字段：
  - `avg_monthly: float` — 月均每笔费用
  - `most_expensive: {name: str, amount: float}` — 最贵订阅
  - `cheapest: {name: str, amount: float}` — 最便宜订阅
  - `top3_percentage: float` — Top 3 占总支出百分比
* UI 与现有风格一致（shadcn Card）
* 0 个订阅时隐藏卡片区域

## Acceptance Criteria

* [ ] 后端 `GET /api/v1/subscriptions/stats` 返回 `avg_monthly`、`most_expensive`、`cheapest`、`top3_percentage` 新字段
* [ ] 前端 `SubscriptionStats` 类型同步更新
* [ ] StatisticsPage 顶部渲染 4 个卡片，位于现有饼图上方
* [ ] 0 个订阅时卡片区域隐藏
* [ ] 金额显示带用户 base_currency 格式
* [ ] Lint / typecheck 通过

## Definition of Done

* 后端接口新增/扩展，返回足够统计数据
* 前端组件更新，展示新统计信息
* Lint / typecheck 通过
* UI 与现有风格一致

## Out of Scope

* 历史消费记录存储/真实历史趋势
* 订阅状态分布图
* 计费周期分布图
* 即将到期时间线
* 帕累托图
* DashboardPage 修改

## Technical Notes

* 后端统计接口：`backend/app/routers/subscriptions.py:122-166`
* 后端 Schema：`backend/app/schemas/subscription.py:58-64` (`SubscriptionStats`)
* 前端统计页面：`frontend/src/pages/StatisticsPage.tsx`
* 前端类型：`frontend/src/api/types.ts:71-78`
* 前端 Dashboard（风格参考）：`frontend/src/pages/DashboardPage.tsx`
