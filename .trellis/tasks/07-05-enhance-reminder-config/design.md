# Design — Enhance reminder configuration

## Architecture overview

改动分三层，沿现有架构延伸，不引入新模块：

```
DB migration ──► Subscription model (+3 fields)
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  schemas/subscription  scanner.py       routers/subscriptions.py
  (Create/Update/Resp   (per-sub window) (stats due_soon fix +
   + ReminderMode enum)                  create/update wiring)
                          │
                          ▼
            frontend api/types + SubscriptionForm
            + SettingsPage (number input)
            + due.ts (per-sub effective days)
```

## Data model changes

### `Subscription` 新增三字段

| 字段 | 类型 | 默认 / server_default | 说明 |
|---|---|---|---|
| `reminder_enabled` | `Boolean` | `True` / `text("1")`, NOT NULL | 此订阅是否参与提醒扫描 |
| `reminder_mode` | `Enum("default","custom")` | `"default"`, NOT NULL | `default`=跟随全局 `User.reminder_days`；`custom`=用本订阅 `reminder_days` |
| `reminder_days` | `Integer` | `None`, nullable | 仅 `custom` 生效；范围 1..90（schema 校验，DB 不约束） |

新增 `ReminderMode` enum（`backend/app/models/subscription.py`，与 `CycleUnit`/`SubscriptionStatus` 同文件同风格）。

### 迁移

- 新建 alembic revision，`down_revision = "b8f3a1c2d4e7"`（当前 head）。
- `upgrade`：三条 `op.add_column('subscriptions', ...)`，`reminder_enabled` 用 `server_default=text('1')`、`reminder_mode` 用 `server_default=text("'default'")`（SQLite/Postgres 兼容：用 `sa.text("'default'")` 形式，参考现有 `locale`/`base_currency` 写法）。
- 现有行迁移后即满足验收：`reminder_enabled=true`、`reminder_mode='default'`、`reminder_days=null`，行为不变。
- `downgrade`：反向 `op.drop_column`。

### 兼容性
- 旧前端调用 `POST/PUT /subscriptions` 不带新字段 → schema 用默认值（`reminder_enabled=True`, `reminder_mode="default"`, `reminder_days=None`），行为等价现状。
- 旧 `GET` 响应新增三个字段 → 前端 TS interface 同步扩展，旧前端忽略多余字段不报错。

## Backend contracts

### schemas/subscription.py

- 新增 `ReminderMode(str, enum.Enum)`: `default = "default"`, `custom = "custom"`。
- `SubscriptionCreate` / `SubscriptionUpdate` 增加可选字段：
  - `reminder_enabled: bool = True`（Update 用 `bool | None = None`）
  - `reminder_mode: ReminderMode = ReminderMode.default`（Update 可选）
  - `reminder_days: int | None = Field(default=None, ge=1, le=90)`
- `SubscriptionResponse` 增加三字段（`reminder_enabled`, `reminder_mode`, `reminder_days`）。
- **校验**：在 `Create`/`Update` 上加 `model_validator(mode="after")` —— 当 `reminder_mode == custom` 时要求 `reminder_days` 不为 null 且 1..90，否则 422。`default` 模式下强制把 `reminder_days` 置为 `None`（入库一致，避免脏数据）。

### routers/subscriptions.py

- create/update 端点透传新字段到模型（Pydantic → ORM 直接赋值，已有模式）。
- **stats due_soon 修正** (`subscriptions.py:267-282`)：
  - 删除硬编码 `three_days = today + timedelta(days=3)`。
  - 取 `current_user`，按订阅逐个计算有效提前天数：
    - `reminder_mode == default` → `user.reminder_days`
    - `reminder_mode == custom` → `sub.reminder_days`
  - 筛选 `next_billing_date` 在 `[today, today + effective_days]` 内、且未 acknowledge 的 active 订阅。
  - 因每订阅窗口不同，改为先拉该用户所有 active + 未 acknowledge + 有 next_billing_date 的订阅，再在 Python 层按有效天数过滤（避免 N 个窗口的复杂 SQL）。

### services/notifications/scanner.py

- `process_reminders` 主循环改为：
  1. 仍先按 `User.reminders_enabled.is_(True)` 过滤用户。
  2. 对每个用户，查所有非 cancelled + 有 `next_billing_date` + 未 acknowledge 的订阅（**不再**用统一 `window_end`）。
  3. 逐订阅：
     - `sub.reminder_enabled == False` → skip（不影响 Dashboard）。
     - 计算 `effective_days`（default→`user.reminder_days`；custom→`sub.reminder_days`）。
     - `window_end = today + timedelta(days=effective_days)`。
     - `today <= next_billing_date <= window_end` 才发送。
  4. 渠道仍 `build_channels(user)`（账户级，D1）。

## Frontend contracts

### api/types.ts

- `Subscription` / `SubscriptionCreate` / `SubscriptionUpdate` 增加可选 `reminder_enabled?: boolean`、`reminder_mode?: "default" | "custom"`、`reminder_days?: number | null`。

### SettingsPage.tsx（R1）

- 删除 `REMINDER_DAYS_OPTIONS` 常量与 `NotificationsCard` 的 `reminderDaysOptions` prop。
- `Select` → `Input type="number" min={1} max={90}`，`value={settings.reminder_days}`，`onChange` 转 Number 写入。保留 `update("reminder_days", n)`。

### SubscriptionForm.tsx（R2）

- 新增 state：`reminderEnabled`（默认 true）、`reminderMode`（默认 "default"）、`reminderDays`（默认 3 或 null）。
- 表单底部（紧邻 `auto_renew` 开关）新增"提醒"区：
  - `Switch` 绑定 `reminderEnabled`。
  - 模式选择：两个 radio/Select（`default` / `custom`）。
  - 仅 `reminderMode === "custom"` 时渲染天数 `Input type=number min=1 max=90`。
- 提交时把三字段并入 payload（`reminder_enabled`、`reminder_mode`、`reminder_days`）。`default` 模式下 `reminder_days` 传 null。
- 编辑回填：从 `subscription?.reminder_*` 读取。

### due.ts + Dashboard / SubscriptionsPage

- `isDueWithin` 签名不变（仍接收一个 `reminderDays: number`），但调用方改为传**该订阅的有效天数**：
  - `SubscriptionsPage.tsx:202` `isDueSoon` 改为 `(sub) => isDueWithin(sub.next_billing_date, effectiveDaysFor(sub, userReminderDays))`。
  - Dashboard `due_soon` 来自后端 stats（已按有效天数过滤），前端 `reminderDays` prop 仅用于副标题文案（`subtitleClear`/`allClearSubtitle`），保留全局 `reminderDays` 作展示即可（或后续优化，本次不动文案）。
- 新增小工具函数 `effectiveDaysFor(sub, userReminderDays)`：`sub.reminder_mode === "custom" ? (sub.reminder_days ?? userReminderDays) : userReminderDays`（custom 但 days 为 null 的兜底，正常后端不会出现）。

### i18n

- 新增 key：订阅表单的「提醒」标题/开关/默认/自定义/天数 label，以及设置页若需要的新文案。中英两份。

## Trade-offs

- **stats due_soon 改为 Python 层过滤**：放弃单条 SQL `window_end`，换来每订阅独立窗口。用户订阅量级小（个人记账），性能无感知影响。
- **`reminder_mode` 用枚举而非可空天数**：多一列，但语义清晰、可扩展（D3）。
- **不下沉渠道到订阅级**：牺牲"每订阅独立渠道"能力，换模型/UI 简洁（D1）。

## Rollback

- 迁移 `downgrade` 删三列即可；后端 schema/model 回退后旧前端调用不受影响（新字段对旧后端是未知字段，Pydantic `extra` 策略：`SubscriptionCreate` 未设 `forbid`，默认忽略，安全）。
- 前端回退：表单/设置页回旧版本即可，无数据依赖。

## Risky points

- `reminder_mode` 的 `server_default` 在 SQLite 上对 enum 列的兼容：参考现有 `status`/`cycle_unit`（均无 server_default）。本次新增列带 server_default 是为了现有行迁移，需在 upgrade 时显式给存量行赋值（`server_default` 生效）。downgrade 不需要清数据。
- alembic head 确认：当前 head 为 `b8f3a1c2d4e7`，新 revision 以此为 `down_revision`。开始实现前用 `alembic heads` 再确认一次。