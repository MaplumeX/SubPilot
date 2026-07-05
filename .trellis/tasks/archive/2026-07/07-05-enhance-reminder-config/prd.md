# Enhance reminder configuration

## Goal

增强到期提醒的灵活性：全局默认提醒天数可自由输入（而非固定 1/3/7/14 选项）；每个订阅可独立配置是否提醒、以及使用全局默认还是自定义提前天数。

## Background (confirmed from code)

- 全局提醒配置位于 `User` 模型 (`backend/app/models/user.py:38-58`)：
  - `reminders_enabled: bool`（总开关）
  - `reminder_days: int`（默认 3，后端校验 `1..90`，见 `schemas/notification.py:21`）
  - 渠道开关 `reminder_email_enabled` / `reminder_telegram_enabled`
- `Subscription` 模型 (`backend/app/models/subscription.py`) **没有任何提醒相关字段**，全部走全局配置。
- 扫描器 `backend/app/services/notifications/scanner.py:18-65` 仅按 `User.reminder_days` 计算窗口 `[today, today+reminder_days]`，对用户名下所有非取消订阅生效。
- 前端 `SettingsPage.tsx` 用 `Select` 渲染固定选项 `[1,3,7,14]`（`REMINDER_DAYS_OPTIONS`）。
- 前端 `due.ts` 的 `isDueWithin(nextBillingDate, reminderDays)` 用于 Dashboard "即将到期" 判断，依赖全局 reminderDays。
- 现有迁移：`45f6eb360605_add_reminder_settings_and_acknowledged_at`（User 字段）。

## Requirements

### R1. 全局默认提醒天数改为自由输入
- 后端 `reminder_days` 校验范围 `1..90` 已存在，保留。
- 前端 `SettingsPage.tsx` 的 `Select`（固定 1/3/7/14）改为数字输入（Input type=number，min=1 max=90）。

### R2. 每个订阅可独立配置提醒
- `Subscription` 新增字段：
  - `reminder_enabled: bool`（是否对此订阅发提醒，默认 true）
  - `reminder_mode: enum("default" | "custom")`（default=跟随全局，custom=使用本订阅自定义天数）
  - `reminder_days: int | null`（仅 `custom` 模式生效，范围 1..90）
- 订阅创建/编辑表单新增"提醒"配置区：开关 + 模式选择 +（custom 时显示）天数输入。

### R3. 扫描器逻辑更新
- 全局 `User.reminders_enabled=false` 时，整体不发提醒。
- 全局开启时，对每个订阅：
  - `reminder_enabled=false` → 跳过该订阅（仅影响通知发送，不影响 Dashboard 展示）
  - `reminder_mode=default` → 用 `User.reminder_days`
  - `reminder_mode=custom` → 用 `Subscription.reminder_days`
- Dashboard "即将到期" 列表 (`isDueWithin`) 按订阅级**有效提前天数**（mode 决定）判断，**不受** `reminder_enabled` 影响。
- 修正现有缺陷：后端 stats 端点 `due_soon` 当前硬编码 3 天窗口 (`subscriptions.py:267`)，未用全局 `reminder_days`；本次一并改为按订阅级有效天数计算。

## Acceptance Criteria

- [ ] 设置页提醒天数可输入任意 1..90 整数并保存成功。
- [ ] 新建/编辑订阅时可选择"启用提醒"开关、模式（默认/自定义）、自定义天数。
- [ ] 选择 `default` 时不展示自定义天数输入；选择 `custom` 时展示并校验 1..90。
- [ ] 全局关闭时，无论订阅配置如何，都不发提醒。
- [ ] 订阅 `reminder_enabled=false` 时该订阅不被扫描器选中。
- [ ] 订阅 `custom` 模式下使用自定义天数计算提醒窗口，与全局天数不同时仍按自定义生效。
- [ ] 现有订阅迁移后：`reminder_enabled=true`、`reminder_mode=default`、`reminder_days=null`，行为与现状一致。
- [ ] Dashboard "即将到期" 按订阅级有效天数判断（不受 `reminder_enabled` 影响）。
- [ ] 后端 stats `due_soon` 窗口使用订阅级有效天数，不再硬编码 3 天。

## Out of Scope

- 多个提前天数（如同时提前 7 天和 1 天发两次）—— 仍为单值。
- 提醒时间点/时区配置（仍按扫描器定时任务）。
- 渠道级（email/telegram）的订阅覆盖 —— 渠道仍是全局开关。

## Decisions

- D1: 提醒渠道（email/telegram）仍为账户级全局开关，不下沉到订阅级。订阅级只覆盖「是否提醒」和「提前天数」。
- D2: `reminder_enabled=false` 只影响通知发送，不影响 Dashboard due_soon 展示。Dashboard 用订阅级有效天数判断，与通知开关解耦。
- D3: `reminder_mode` 用枚举字符串 `"default" | "custom"` 存储（与 `CycleUnit`/`SubscriptionStatus` 一致）。`custom` 模式下 `reminder_days` 必填且校验 1..90；`default` 模式下 `reminder_days` 为 null（后端入库时强制清空）。

## Open Questions

(无 — 所有产品决策已确认)