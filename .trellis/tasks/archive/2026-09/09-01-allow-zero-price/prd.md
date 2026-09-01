# 允许订阅金额设置为 0 元（免费）

## 背景

当前订阅金额强制必须大于 0（后端 `gt=0`，前端校验 `<= 0` 拒绝），用户无法录入免费订阅（如免费层服务、0 元试用转正等场景）。

## 需求

允许订阅价格设置为 0，但仍禁止负数。

## 改动点

1. **后端** `backend/app/schemas/subscription.py`
   - `SubscriptionCreate.price: Field(gt=0)` → `ge=0`
   - `SubscriptionUpdate.price: Field(default=None, gt=0)` → `ge=0`
2. **前端** `frontend/src/components/SubscriptionForm.tsx`
   - 校验 `priceNum <= 0` → `priceNum < 0`
3. **i18n**（中英文）
   - `subscriptionForm.pricePositive`: 「价格必须大于 0」→「价格不能为负」/ "Price must be greater than 0" → "Price cannot be negative"

## 验收标准

- [ ] AC1: 创建订阅时价格可填 0，保存成功
- [ ] AC2: 编辑订阅时价格可改为 0，保存成功
- [ ] AC3: 负数价格仍被前后端拒绝
- [ ] AC4: 金额为 0 的订阅在列表、仪表盘、现金流统计中正常显示（不报错、不破坏统计）
- [ ] AC5: 提示文案与「不能为负」语义一致（中英文）

## 说明

金额 0 对现有统计逻辑（求和、汇率换算、月均换算）无副作用，无除以 price 的逻辑。
