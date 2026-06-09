# Currency Exchange Rate Conversion

## Goal

为 SubPilot 添加汇率转换功能，使仪表盘和列表页能正确显示多币种订阅的统一基准币种金额。当前系统允许订阅使用不同币种，但统计时直接加总所有金额，结果毫无意义。

## Requirements

* 后端新增 `ExchangeRate` 模型，存储汇率到 SQLite（复用现有 SQLAlchemy/alembic 体系）
* 后端新增汇率服务：每日通过 Frankfurter API 获取汇率，用 USD 作为 API base，通过交叉计算得出所有货币对汇率
* 后端新增 APScheduler 定时任务：每日获取汇率并 upsert 到 DB
* 后端 `_normalize_to_monthly()` 改造：在周期归一化后，再乘以汇率转换为用户基准币种
* 后端 `get_stats()` API：按用户 `base_currency` 汇总，响应新增 `base_currency` 字段
* 后端新增 `base_currency` 字段到 User 模型（默认 "CNY"）
* 后端新增设置 base_currency 的 API 端点
* 后端订阅列表 API 响应新增 `converted_price` 字段（转换为基准币种的月均价格）
* 前端 Dashboard 使用 `Stats.base_currency` 动态显示币种符号
* 前端 SubscriptionsPage 列表额外显示换算后金额
* 前端 Settings 页新增基准币种选择
* 前端 i18n 新增相关翻译（中英）
* 无汇率数据时回退 1:1 汇率（不阻塞功能）

## Acceptance Criteria

* [ ] 不同币种订阅在 Dashboard 正确汇总到用户基准币种
* [ ] Dashboard 月度/年度显示正确的基准币种符号
* [ ] 订阅列表页显示换算后金额（基准币种）
* [ ] 用户可在 Settings 切换基准币种，切换后统计即时更新
* [ ] 汇率每日自动获取并缓存到 DB
* [ ] 首次启动/无汇率时用 1:1 回退，不报错
* [ ] 同币种订阅不经过汇率换算
* [ ] i18n 中英完整

## Definition of Done

* Tests added/updated
* Alembic migration 绿色
* Lint / typecheck / CI green
* i18n 字串完整（中英）

## Technical Approach

**数据源**: Frankfurter API (`https://api.frankfurter.dev/v1/latest?from=USD&to=CNY,EUR,GBP,JPY`)，每日 1 次 API 调用，交叉计算所有货币对。

**缓存**: SQLite `exchange_rates` 表（与项目 SQLAlchemy/alembic 一致），每日 upsert。

**User 模型变更**: 新增 `base_currency: String(3)` 字段，默认 "CNY"。

**Stats API 变更**: `SubscriptionStats` 新增 `base_currency: str`，`total_monthly`/`total_yearly`/`by_category` 值为转换后金额。

**列表 API 变更**: `SubscriptionResponse` 新增 `converted_price: float | None`（月均基准币种价格）。

**降级策略**: 无汇率数据时 1:1 回退（即不做转换）。

**HTTP 客户端**: 用 `httpx`（FastAPI 生态更惯用）或 `urllib.request`（零依赖）。待实现时决定。

## Decision (ADR-lite)

**Context**: 需要选择汇率数据源、基准币种粒度、统计结构、MVP 范围。
**Decision**:
- 数据源: Frankfurter（无需 key/署名，ECB 数据，支持 `to` 过滤）
- 基准币种: 用户级偏好（User.base_currency）
- 统计结构: 最小变更，仅加 `base_currency` 字段
- MVP 范围: Dashboard 统计 + 列表页换算显示，不含历史汇率趋势
**Consequences**: 未来若需历史趋势图，Frankfurter 已有 time-series API 支持。如果 Frankfurter 下线，可切换到 open.er-api.com（改 URL + 加署名即可）。

## Out of Scope

* 历史汇率趋势图
* 按订阅显示汇率明细/原始币种对比
* 手动刷新汇率按钮
* 汇率 API 不可用时的告警/重试机制（1:1 回退即可）

## Technical Notes

* 后端模型: `backend/app/models/subscription.py` — currency 字段
* 后端统计: `backend/app/routers/subscriptions.py` — `_normalize_to_monthly()` 和 `get_stats()`
* 后端配置: `backend/app/config.py` — pydantic-settings
* 后端定时任务模式: `backend/app/main.py` + `backend/app/services/renewal.py`
* 前端 Dashboard: `frontend/src/pages/DashboardPage.tsx` — 硬编码 CNY
* 前端设置: `frontend/src/pages/SettingsPage.tsx` — 可加币种选择
* 前端表单: `frontend/src/components/SubscriptionForm.tsx` — CURRENCIES 常量
* 前端类型: `frontend/src/api/types.ts` — SubscriptionStats 无币种字段
* 研究: `research/exchange-rate-apis.md` — API 对比和缓存策略详细分析

## Research References

* [`research/exchange-rate-apis.md`](research/exchange-rate-apis.md) — Frankfurter 最优，SQLite 缓存，1 次/日 API 调用 + 交叉计算
