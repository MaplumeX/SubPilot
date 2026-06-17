# Design — 订阅支付方式字段

## Boundaries

为 `subscriptions` 增加一个 nullable=False 的字符串字段 `payment_method`，全链路贯通：DB → Model → Schema → Router → 前端 types → api client → Form（combobox）→ 列表/卡片展示 → i18n。

交互上完全复刻现有 `category` 字段的 combobox（Popover + Command 历史记录搜索 + 可输入新值），区别仅在于：`payment_method` 必填、不提供"无"清空项、列表/卡片空值展示差异。

## Contracts

### 数据库

- 列：`subscriptions.payment_method`，`String(100)`，`nullable=False`，`server_default=''`。
- 已有行迁移后为空字符串。
- 不建索引、不加唯一约束（与 `category` 一致）。

### API

| Method | Path | 说明 |
|---|---|---|
| POST | `/api/v1/subscriptions` | body 增 `payment_method: str`（必填，min_length=1） |
| PUT | `/api/v1/subscriptions/{id}` | body 增 `payment_method: str \| None`（可选，提供则 min_length=1） |
| GET | `/api/v1/subscriptions` | 每项含 `payment_method: str` |
| GET | `/api/v1/subscriptions/{id}` | 含 `payment_method: str` |
| GET | `/api/v1/subscriptions/payment-methods` | 新增，返回 `string[]`，当前用户去重 + 字母序 |

### 前端类型

- `Subscription.payment_method: string`
- `SubscriptionCreate.payment_method: string`
- `SubscriptionUpdate.payment_method?: string`

## Data Flow

创建：`SubscriptionForm` combobox → `createSubscription(payload)` → POST → router 写入 `payment_method`。  
编辑：`SubscriptionForm` 初值取 `subscription.payment_method` → `updateSubscription(id, payload)` → PUT → `model_dump(exclude_unset=True)` 仅在提供时更新。  
列表：`listSubscriptions()` → 每项含 `payment_method` → 表格新增列 / 卡片展示。  
历史记录：表单挂载时 `listPaymentMethods()` → 填充 combobox 候选项。

## 关键设计决策

1. **为何可空列却必填**：迁移必须能在已有数据上无错通过，故 `server_default=''`、`nullable=False`；业务必填性由 schema 层 (`min_length=1`) 与前端校验保证，不依赖 DB NOT NULL 约束（已有行无法回填真实值）。这与 `category`（可空、选填）的语义区分开。
2. **复用 category combobox 模式**：不引入枚举，保持与 `category` 一致的自由文本 + 历史记录模式，用户可输入任意支付方式字符串。
3. **历史记录接口独立**：`/payment-methods` 独立于 `/categories`，避免混入无支付方式语义的分类候选。
4. **路由顺序**：`/payment-methods` 静态路径必须定义在 `/{subscription_id}` 之前，否则 `payment-methods` 会被当成 `subscription_id` 解析（与现有 `/categories`、`/stats` 的处理一致）。

## Compatibility / Rollback

- 迁移可回滚（`drop_column`）；回滚后模型与 schema 需同步退回，否则 ORM/Pydantic 报错。本任务一并回滚代码即可。
- 前端旧版本向后兼容：旧前端不发送 `payment_method`，后端因 schema 必填会 422。由于前后端同仓部署、无独立版本客户端，可接受。

## Out of Scope

- 按支付方式统计 / 筛选 / 分组。
- 支付方式枚举或图标。
- 国际化支付方式名称（仅做 UI 文案 i18n，值本身为用户自填文本）。
