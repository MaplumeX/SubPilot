# 修复支付方式/分类路由顺序导致无法正常添加订阅

## Goal

修复 `backend/app/routers/subscriptions.py` 中静态子路径路由被动态路由 `/{subscription_id}` 抢先匹配，导致 `/payment-methods` 返回 422、前端"支付方式"下拉无法加载已有列表的问题。顺带消除同类路由顺序隐患。

## Background

FastAPI 按路由声明顺序匹配。当前文件中：

- `GET /categories`、`GET /stats` 声明在 `GET /{subscription_id}` **之前** → 正常。
- `GET /payment-methods` 声明在 `GET /{subscription_id}` **之后** → `"payment-methods"` 被当作订阅 ID 捕获，无法转 int → 422。

前端 `SubscriptionForm.tsx` 在挂载时调用 `listPaymentMethods()`（及 `listCategories()`）填充下拉已有项。`/payment-methods` 422 → 下拉为空、且因 `Command` 组件配合受控 `value`，在已有项为空且输入值未落库时可能出现无法选中/添加新条目的体验问题。`/categories` 因路由顺序正确而看似正常，但同样属于"顺序敏感"的脆弱设计。

## Requirements

- `GET /api/v1/subscriptions/payment-methods` 能正常返回当前用户已用过的支付方式字符串列表（不再被动态路由拦截返回 422）。
- 所有静态子路径路由（`/categories`、`/stats`、`/upload-logo`、`/payment-methods`、`/{id}/acknowledge`）均不受 `GET/PUT/DELETE /{subscription_id}` 动态路由影响。
- 不改变任何端点的 URL、请求/响应结构、行为语义。
- 不修改前端逻辑（前端无需改动）。

## Acceptance Criteria

- [ ] `GET /api/v1/subscriptions/payment-methods` 返回 200 与字符串列表；无既有数据时返回 `[]`。
- [ ] `GET /api/v1/subscriptions/categories` 仍正常工作。
- [ ] `GET /api/v1/subscriptions/{id}` 等动态路由不受影响（合法 id 正常返回，非法 id 仍 422/404）。
- [ ] 在订阅表单中"支付方式""分类"可正常输入、选择、提交并创建新订阅。
- [ ] 后端通过 lint/类型检查与既有测试（如有）。

## Notes

- 这是一个路由声明顺序 bug，最小修复 = 调整路由声明顺序，使所有静态子路径位于 `/{subscription_id}` 之前。
- 不引入额外抽象或"路由表"配置；保持改动最小且匹配现有风格。
