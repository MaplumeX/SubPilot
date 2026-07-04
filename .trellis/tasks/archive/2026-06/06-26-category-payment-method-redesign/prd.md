# PRD: Redesign Category & Payment Method as Managed Entities

## Goal

将 `category`(分类)和 `payment_method`(支付方式)从订阅表上的**自由文本字段**改造为**独立管理的用户级实体**,并在设置页提供集中增删改查入口,解决当前"随用随建、无去重归一化、无统一管理"的问题。

## Background / Current State

- 数据模型 (`backend/app/models/subscription.py`):
  - `category`: `String(100), nullable=True`
  - `payment_method`: `String(100), nullable=False, server_default=""`
- "列表"是通过 `DISTINCT` 从已有订阅派生的:
  - `GET /api/v1/subscriptions/categories`
  - `GET /api/v1/subscriptions/payment-methods`
- 前端 `SubscriptionForm.tsx` 用 Combobox(自由输入 + 已有值),无真正"新建/管理"入口
- `SettingsPage.tsx` 目前只管 语言/基础货币/通知,无分类或支付方式管理

## Requirements

- 新建 `Category` / `PaymentMethod` 两个用户级实体表(per-user),最小字段集:仅 `name`,per-user 唯一。
- 提供独立 CRUD API:创建、列表、重命名(rename)、删除。
- 前端在设置页提供集中管理 UI(增、删、改)。
- `SubscriptionForm` 改为**只能从已建实体选择**(Select,不再自由输入)。
- 迁移现有订阅数据:从字符串字段替换为外键引用 `category_id` / `payment_method_id`。

## Confirmed Decisions

- **实体字段集**:最小集,仅 `name`(per-user 唯一)。不加颜色/图标/排序——那是独立增量,不耦合进本期。
- **删除被引用实体**:阻止删除。`DELETE` 端点先查引用计数,>0 返回 409 + counting;前端据此提示"被 N 条订阅使用,无法删除"。不引入悬空引用、不回退自由文本。
- **迁移策略(开发阶段)**:不考虑过渡/兼容。直接在 `subscriptions` 表上把 `category: String(100) nullable` / `payment_method: String(100) not null default ''` 两个字符串列**替换**为 `category_id: FK -> categories.id` / `payment_method_id: FK -> payment_methods.id` 外键列。不保留旧字符串列、不做双写。迁移脚本建表 + 回填(按 user 去重现有字符串值建实体,回填外键 ID)。
- **SubscriptionForm 选择交互**:只能从已建实体里选(Select),不允许在表单内即时新建。实体唯一入口在 SettingsPage。
- **重命名**:提供 rename。订阅引用的是 id,name 改了通过外键级联自动生效,UI 体现为内联编辑。重命名时校验新名字在 per-user 范围内不重名。
- **首次使用 / 空状态**:迁移脚本只回填已有用户的历史订阅数据(按 user 去重字符串值建实体 + 回填外键)。新用户不预置任何种子。`SubscriptionForm` 检测到实体列表为空时显示空状态提示并引导去设置页添加(尤其 payment_method 必填场景会显式提示)。

## Acceptance Criteria

### Backend
- AC-1: `categories`、`payment_methods` 两表存在,各含 `id`、`user_id`(FK→users CASCADE)、`name`、`created_at`,且 `UNIQUE(user_id, name)`。
- AC-2: `subscriptions` 表移除 `category`/`payment_method` 字符串列,新增 `category_id`(nullable FK RESTRICT→categories.id)和 `payment_method_id`(NOT NULL FK RESTRICT→payment_methods.id)。
- AC-3: Alembic 迁移可 `upgrade head` 成功,现有订阅数据被正确回填(`category_id`/`payment_method_id` 指向按 user 去重后建出的实体)。
- AC-4: `POST /api/v1/categories` 和 `/api/v1/payment-methods` 创建实体;重名返回 409。
- AC-5: `GET /api/v1/categories` / `/api/v1/payment-methods` 返回当前用户的实体列表。
- AC-6: `PATCH /api/v1/categories/{id}` / `/payment-methods/{id}` 重命名;不属于当前用户返回 404;重名返回 409。
- AC-7: `DELETE /api/v1/categories/{id}` / `/payment-methods/{id}`:被引用时返回 409 + `{detail, count}`;未被引用时返回 204。
- AC-8: `POST/PUT /api/v1/subscriptions` 校验 `category_id`/`payment_method_id` 属于当前用户,否则 404/400。
- AC-9: `SubscriptionResponse` 中 `category` 为 `{id,name}|null`、`payment_method` 为 `{id,name}`(通过 joinedload 填充)。
- AC-10: `GET /api/v1/subscriptions` 的 `category` 过滤参数改为按 `category_id`(int)过滤。
- AC-11: 旧的 `GET /api/v1/subscriptions/categories` 与 `/payment-methods` 端点移除。
- AC-12: `GET /api/v1/subscriptions/stats` 的 `by_category` 仍以分类 name 字符串为 key。
- AC-13: 后端 `ruff check` 通过。

### Frontend
- AC-14: 设置页新增"分类管理"和"支付方式管理"卡片,支持新增、内联重命名、删除;删除被引用时显示 i18n 化的"被 N 条订阅使用,无法删除"提示。
- AC-15: `SubscriptionForm` 分类/支付方式字段改为 `Select`(只选已建实体),提交负载使用 `category_id`/`payment_method_id`。
- AC-16: `SubscriptionForm` 在实体列表为空时显示空状态提示;payment_method 必填且为空时阻止提交并提示去设置页添加。
- AC-17: `SubscriptionsPage` 分类过滤下拉改为按实体 id 过滤;表格单元格显示 `category?.name`/`payment_method?.name`,`null` 时显示 "-"。
- AC-18: `SubscriptionCard` 展示 `category?.name`/`payment_method?.name` 且无空指针。
- AC-19: `StatisticsPage` 分类分布图表仍正常渲染(无类型错误)。
- AC-20: `frontend/src/i18n/{en,zh-CN}.json` 中所有新增 key 齐全。
- AC-21: 前端 `npm run lint && npm run build` 通过。

## Out of Scope

- 颜色 / 图标 / 排序字段(留作后续增量)。
- 旧字符串列的兼容保留(开发阶段,直接替换)。
- 通用种子数据预置(新用户走空状态引导,不为新用户预置默认分类/支付方式)。
