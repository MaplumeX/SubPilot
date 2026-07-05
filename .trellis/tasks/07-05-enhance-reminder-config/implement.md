# Implement — Enhance reminder configuration

## Ordered checklist

### A. Backend model + migration
- [ ] A1. `backend/app/models/subscription.py`：新增 `ReminderMode(str, enum.Enum)`（`default`/`custom`）；`Subscription` 加三字段 `reminder_enabled` / `reminder_mode` / `reminder_days`（类型/默认/server_default 见 design.md）。
- [ ] A2. 生成/手写 alembic revision：`down_revision = "b8f3a1c2d4e7"`，`upgrade` 三条 `add_column`（`reminder_enabled` server_default `text('1')`、`reminder_mode` server_default `text("'default'")`、`reminder_days` nullable 无 server_default），`downgrade` 反向 drop。文件名 `<newrev>_add_subscription_reminder_fields.py`。
- [ ] A3. 跑迁移：`cd backend && uv run alembic upgrade head`，检查 `subpilot.db` 中 `subscriptions` 表新列 + 存量行默认值（`reminder_enabled=1`、`reminder_mode='default'`、`reminder_days=NULL`）。

### B. Backend schemas + router
- [ ] B1. `backend/app/schemas/subscription.py`：新增 `ReminderMode`（或从 models 导入复用，避免重复定义——优先从 `app.models.subscription` import）；`SubscriptionCreate`/`SubscriptionUpdate`/`SubscriptionResponse` 加三字段；加 `model_validator(mode="after")`：`custom` 要求 `reminder_days` 非 null 且 1..90，`default` 强制 `reminder_days=None`。
- [ ] B2. `backend/app/routers/subscriptions.py` create/update 端点：确认 Pydantic → ORM 赋值链路（现有写法是 `Subscription(**payload.model_dump())` 之类），新字段自动随入；若用显式字段赋值则补三字段。
- [ ] B3. `backend/app/routers/subscriptions.py` stats `due_soon`：删 `three_days`，改为拉该用户 active + 有 next_billing_date + 未 acknowledge 的订阅，Python 层按 `effective_days` 过滤（`default→user.reminder_days`，`custom→sub.reminder_days`）。
- [ ] B4. `backend/app/services/notifications/scanner.py`：按 design.md 重写主循环——逐订阅计算 `effective_days` 与 `window_end`，`reminder_enabled=False` 跳过；渠道仍账户级。

### C. Frontend types + api
- [ ] C1. `frontend/src/api/types.ts`：`Subscription` / `SubscriptionCreate` / `SubscriptionUpdate` 加 `reminder_enabled?` / `reminder_mode?: "default"|"custom"` / `reminder_days?: number | null`。

### D. Frontend SettingsPage（R1）
- [ ] D1. `frontend/src/pages/SettingsPage.tsx`：删 `REMINDER_DAYS_OPTIONS` 常量 + `NotificationsCard` 的 `reminderDaysOptions` prop；`Select`（提醒天数）替换为 `Input type="number" min={1} max={90}`，`value={settings.reminder_days}`，`onChange` → `update("reminder_days", Number(e.target.value))`。

### E. Frontend SubscriptionForm（R2）
- [ ] E1. `frontend/src/components/SubscriptionForm.tsx`：新增三 state（`reminderEnabled` 默认 true、`reminderMode` 默认 "default"、`reminderDays` 默认 null/3）；编辑回填 `subscription?.reminder_*`。
- [ ] E2. 表单底部新增"提醒"区：`Switch`（启用提醒）+ 模式选择（default/custom，用 RadioGroup 或 Select）+ 条件渲染天数 `Input type=number min=1 max=90`（仅 custom）。
- [ ] E3. submit payload 并入三字段；`default` 模式 `reminder_days` 传 null。
- [ ] E4. i18n：`frontend/src/i18n/{zh-CN,en}.json` 加订阅表单提醒相关 key。

### F. Frontend due 判断（R3/D2）
- [ ] F1. 新增工具 `effectiveDaysFor(sub, userReminderDays)`（可放 `frontend/src/lib/due.ts`）：`sub.reminder_mode === "custom" ? (sub.reminder_days ?? userReminderDays) : userReminderDays`。
- [ ] F2. `frontend/src/pages/SubscriptionsPage.tsx:202`：`isDueSoon` 改用 `effectiveDaysFor(sub, reminderDays)`。
- [ ] F3. Dashboard `due_soon` 走后端 stats（B3 已按有效天数过滤），前端无需再改判断；`reminderDays` prop 仍用于副标题文案，保持。

### G. 收尾验证
- [ ] G1. `cd backend && uv run ruff check . && uv run python -c "import app.main"`（或现有 lint 命令）。
- [ ] G2. `cd frontend && npm run build`（含 `tsc -b` 类型检查）+ `npm run lint`。
- [ ] G3. 手动：设置页输入 5 天保存成功；新建订阅选 custom+7 天；编辑订阅切回 default；Dashboard due_soon 与全局天数不同时按订阅级生效；全局关 reminders_enabled 后扫描器不发（可临时触发 `process_reminders` 验证或看日志）。

## Validation commands

```bash
# backend lint / 导入
cd backend && uv run ruff check . && uv run python -c "import app.main"
# migration
cd backend && uv run alembic upgrade head && uv run alembic current
# frontend typecheck + build
cd frontend && npm run build
cd frontend && npm run lint
```

## Risky files / rollback points

- `backend/alembic/versions/<newrev>_add_subscription_reminder_fields.py` — 迁移出错可 `alembic downgrade -1`。
- `backend/app/services/notifications/scanner.py` — 提醒发送核心逻辑，改动后务必手动触发一次扫描验证。
- `backend/app/routers/subscriptions.py:267` stats due_soon — 改动影响 Dashboard 主视图，回归测试重点。
- `frontend/src/components/SubscriptionForm.tsx` — 表单状态多，注意编辑回填与 default 模式清空 reminder_days 的联动。

## Pre-start checks

- 开始实现前再跑一次 `cd backend && uv run alembic heads` 确认 head 仍是 `b8f3a1c2d4e7`（若期间有新迁移需调整 `down_revision`）。
- 确认 `backend/app/schemas/subscription.py` 是否设了 `model_config = {"extra": "forbid"}` —— 若有，旧前端不带新字段不会报错（新字段都有默认）；但前端新带字段后旧后端会 422，回滚时需同时回前端。