# Implement — 订阅支付方式字段

执行顺序自上而下；每步完成后立即运行其验证命令。

## 1. 后端：数据库迁移

- [ ] 新建 `backend/alembic/versions/<rev>_add_payment_method_to_subscriptions.py`，`down_revision = '3e375e180a44'`。
  - `upgrade()`：`op.add_column('subscriptions', sa.Column('payment_method', sa.String(100), server_default='', nullable=False))`
  - `downgrade()`：`op.drop_column('subscriptions', 'payment_method')`
- [ ] 验证：`alembic upgrade head`（或环境对应命令）成功；`alembic downgrade -1` 再 `upgrade head` 来回无错。

## 2. 后端：Model / Schema / Router

- [ ] `backend/app/models/subscription.py`：新增 `payment_method: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")`（置于 `category` 附近）。
- [ ] `backend/app/schemas/subscription.py`：
  - `SubscriptionCreate`：`payment_method: str = Field(min_length=1)`
  - `SubscriptionUpdate`：`payment_method: str | None = Field(default=None, min_length=1)`
  - `SubscriptionResponse`：`payment_method: str`
- [ ] `backend/app/routers/subscriptions.py`：新增 `GET /payment-methods`（置于 `/{subscription_id}` 注册之前，参照现有 `/categories` 实现：`distinct` + `order_by` + 过滤空字符串 + 仅本人）。
- [ ] 验证：后端 lint / 类型检查 / 测试。

## 3. 前端：types / api client

- [ ] `frontend/src/api/types.ts`：三处接口增 `payment_method` 字段。
- [ ] `frontend/src/api/subscriptions.ts`：新增 `listPaymentMethods()`。
- [ ] 验证：`tsc --noEmit`（依项目脚本）。

## 4. 前端：表单 combobox

- [ ] `frontend/src/components/SubscriptionForm.tsx`：
  - 引入/复用 `listPaymentMethods`，`useState` 存候选项与输入值。
  - 新增 `payment_method` combobox（Popover + Command），交互复刻 `category` 块，但：必填、无"无"选项、占位文案为 `selectPaymentMethod`。
  - `handleSubmit` 校验非空并写入 `payload.payment_method`。
- [ ] 验证：表单可搜索/选择/输入新值；空提交报错。

## 5. 前端：列表 / 卡片展示 + i18n

- [ ] `frontend/src/pages/SubscriptionsPage.tsx`：表头与单元格新增"支付方式"列（位于 category 与 status 之间），空字符串显示 `-`。
- [ ] `frontend/src/components/SubscriptionCard.tsx`：摘要行展示 `payment_method`，空字符串不显示。
- [ ] `frontend/src/i18n/zh-CN.json`、`en.json`：新增 4 个文案键。
- [ ] 验证：`tsc` / lint / build 通过。

## 6. 回归与收尾

- [ ] 端到端手测：新建（必填校验 + 历史）/ 编辑 / 列表显示 / 切换中英文。
- [ ] 运行 trellis-check。
- [ ] 更新 spec（如必要）并提交。
