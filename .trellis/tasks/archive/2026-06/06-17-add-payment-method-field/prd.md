# 订阅支持支付方式字段

## Goal

为订阅条目增加一个"支付方式"字段，记录用户通过何种方式支付该订阅（如信用卡、支付宝、微信支付等），方便日后对账与支出归因。

## Field Design

- 字段名（snake_case，贯穿前后端）：`payment_method`
- 形式：自由文本输入 + 历史记录搜索（combobox），复用现有 `category` 字段的交互模式（搜索 + 从已有记录中选择 + 允许输入新值）。
- 必填：新建与编辑时必填，且非空（至少 1 个字符）。

## Requirements

### 数据库与后端

- `subscriptions` 表新增 `payment_method` 列：
  - 类型 `String(100)`，`nullable=False`，`server_default=''`（空字符串），用于让迁移在已有数据上平滑通过。
  - 现有行迁移后保持空字符串；列表/卡片展示时空字符串统一显示为 `-`。
- SQLAlchemy 模型 `Subscription.payment_method` 同步新增。
- Pydantic schema：
  - `SubscriptionCreate.payment_method: str`，`min_length=1`（必填、非空）。
  - `SubscriptionUpdate.payment_method: str | None = None`，且 `min_length=1`（提供时非空）。
  - `SubscriptionResponse.payment_method: str`。
- 新增 `GET /api/v1/subscriptions/payment-methods` 接口，返回当前用户已用过的去重支付方式列表，按字母序排序，供前端 combobox 的历史记录使用（对照现有 `/categories` 实现）。
- Alembic 迁移以 `69eab0587ff4` 为 `down_revision`（当前 head，避免产生多 head）。
  - `upgrade`：`op.add_column('subscriptions', sa.Column('payment_method', sa.String(100), server_default='', nullable=False))`。
  - `downgrade`：`op.drop_column('subscriptions', 'payment_method')`。

### 前端

- `api/types.ts`：`Subscription`、`SubscriptionCreate`、`SubscriptionUpdate` 增加 `payment_method` 字段（`Subscription`/`SubscriptionCreate` 必填，`SubscriptionUpdate` 可选）。
- `api/subscriptions.ts`：新增 `listPaymentMethods(): Promise<string[]>`，调用 `/subscriptions/payment-methods`。
- `SubscriptionForm.tsx`：新增 `payment_method` combobox，交互复刻现有 `category` 的 Popover + Command 实现（历史记录搜索 + 可输入新值），但：
  - 必填校验（提交时为空报错）。
  - 不提供"无"选项（与 category 的选填语义不同）。
  - 默认值：编辑时取 `subscription?.payment_method`，新建时为空字符串。
  - 提交时一并写入 `payload.payment_method`。
- `SubscriptionsPage.tsx`（表格视图）：在"分类"与"状态"之间新增"支付方式"列，空字符串显示 `-`。
- `SubscriptionCard.tsx`（卡片视图）：在过期摘要行附近展示 `payment_method`，空字符串不显示。
- i18n（`zh-CN.json`、`en.json`）：
  - `subscriptions.paymentMethod`（表头 / 卡片标签）
  - `subscriptionForm.paymentMethod`（表单标签）
  - `subscriptionForm.selectPaymentMethod`（combobox 占位）
  - `subscriptionForm.paymentMethodRequired`（必填错误）

## Acceptance Criteria

- [ ] 运行 Alembic 迁移成功为 `subscriptions` 增列，已有行 `payment_method` 为空字符串；可正常回滚。
- [ ] 新建订阅时不填支付方式 → 前端报错、后端 422。
- [ ] 新建/编辑订阅时填写支付方式 → 持久化并返回。
- [ ] Combobox 能搜索并选中当前用户已用过的支付方式，也能输入全新值。
- [ ] `GET /payment-methods` 返回当前用户去重、排序的支付方式列表，不串其他用户数据。
- [ ] 表格视图出现"支付方式"列，空值显示 `-`。
- [ ] 卡片视图展示支付方式（空值不显示）。
- [ ] 中英文文案齐全。
- [ ] 后端 lint / 类型 / 测试通过，前端 lint / 类型检查 / build 通过。

## Notes

- 不引入预设枚举；保持与 `category` 一致的自由文本 + 历史记录模式。
- 不在本任务范围内做按支付方式统计/筛选；仅作为订阅属性记录与展示。
