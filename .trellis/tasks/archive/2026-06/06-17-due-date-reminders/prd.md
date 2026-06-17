# Subscription due-date reminders

## Goal

在订阅即将到期(`next_billing_date` 临近)时,通过多种**外部渠道**(邮件、Telegram 机器人等)主动提醒用户,让用户在扣费/续费前有反应窗口(取消、续费、换卡)。

## User Value

- 用户不再因为忘记续费日期而被意外扣费。
- 用户不再因为忘记取消试用而转为付费。
- 用户可在设置页自定义提醒提前天数与启用的渠道。

## Confirmed Facts (from code inspection)

- 后端:FastAPI + SQLAlchemy + Alembic + APScheduler。
  - `BackgroundScheduler` 已在 `lifespan` 中每日跑 `_run_renewals`、`_run_exchange_rates`(见 `backend/app/main.py:46-49`)。
  - 日度 job 已有现成范式(新建 session → 调服务 → commit → close)。
- `Subscription` 模型已有:`next_billing_date`、`cycle_count`、`cycle_unit`、`status`、`auto_renew`、`user_id`(见 `backend/app/models/subscription.py`)。
- `renewal` 服务已存在:`advance_next_billing_date` / `process_renewals`(见 `backend/app/services/renewal.py`)。
- `SubscriptionStatus` 枚举:`active` / `cancelled` / `trial`。
- `Stats` API 用硬编码 3 天窗口算 `due_soon`(展示用,不发送,见 `backend/app/routers/subscriptions.py:234-246`)。
- `User` 模型已有:`email`、`locale`、`base_currency`(见 `backend/app/models/user.py`)。
- `httpx` 已是依赖(适合发 Telegram)。
- **无邮件库 / 无 SMTP 基础设施**;`requirements.txt` 未列 SMTP / email 相关库。
- 前端 i18n 已就绪(react-i18next),但**后端无 i18n**(提醒消息文案的多语言尚未支持)。
- 设置页 `SettingsPage` 已有语言 / 基础货币两张卡片可作为 UI 范式(见 `frontend/src/pages/SettingsPage.tsx`)。
- 通知 / 提醒相关代码当前完全没有(grep 无命中)。

## Requirements

- 每日定时扫描所有**非 `cancelled`** 的订阅(`active` 和 `trial` 都扫描),对 `next_billing_date` 落在「提醒窗口」内的订阅,通过用户启用的渠道发送提醒。
- 提醒**不论 `auto_renew` 取值**都触发:到期事件本身值得被提醒(`auto_renew` 只影响到期后是否自动续费)。
- **不去重**:窗口内每月每天发送提醒;用户主动「确认已续费」后本周期停止提醒。
  - 提醒窗口 = `today <= next_billing_date <= today+N`(含到期当天);到期当天仍发。
  - 过期后(`today > next_billing_date`)不再发。
  - 只有用户主动「确认已续费」(写 `acknowledged_billing_date`)才在本周期停止每日提醒。
- 「确认已续费」机制:在 `Subscription` 上加 `acknowledged_billing_date` 字段,记录用户已确认到期的那个日期。扫描时若 `acknowledged_billing_date == next_billing_date` 则跳过该订阅。
  - 下个周期推进 `next_billing_date` 后(`auto_renew` 自动推 / 用户手动改),二者不再相等 → 自动恢复提醒,天然支持每周期独立确认。
  - **不动 `next_billing_date`,不改账面数据**;避免与 `process_renewals` 推进日期冲突(推进日期会导致 auto_renew 订阅同一周期被推进两次)。
- 提醒阈值(提前天数)由用户在设置页自选配置,**默认 3 天**(与现有 `Stats.due_soon` 的 3 天窗口一致)。
- 支持**邮件 + Telegram** 两个渠道,均为 per-user 配置:
  - **邮件 = Per-user SMTP**:用户在设置页填自己的 SMTP host/port/user/password(与 Telegram per-user bot 范式一致,零系统基础设施)。
    - 收件人即 `User.email`(注册时必填,已有)。
    - 用标准库 `smtplib`,无需新重依赖。
    - **无降级**:邮件渠道就是各配各的 SMTP,配好才启用。
  - **Telegram = Per-user bot**:bot_token + chat_id 均由用户自填,保存后后端发测试消息验证凭据。
- 渠道凭据与开关存 `User` 表加列——与现有 `locale`/`base_currency` 字段范式一致,项目体量小避免提前抽象子表。
  - 用户级总开关 `reminders_enabled`(默认 true):关掉则整个用户跳过,不发任何渠道。
  - 渠道开关 `reminder_email_enabled` / `reminder_telegram_enabled`:在总开关开启前提下仍可独立启停某一渠道。
  - 阈值 `reminder_days`(int,默认 3)。
  - Telegram 凭据:`telegram_chat_id`、`telegram_bot_token`(均可空,启用 Telegram 渠道时必填,保存后后端发测试消息验证)。
  - 邮件 SMTP 凭据:`smtp_host`、`smtp_port`、`smtp_user`、`smtp_password`(均可空,启用邮件渠道时必填;收件人即 `User.email`)。
  - 扫描逻辑:`reminders_enabled=false` → 跳过该用户;否则对每个已启用渠道独立发送。
  - **Telegram bot_token 与 chat_id 均由用户自填**(用户补充确认)。
  - 凭据明文存 SQLite:本项目为本地/单机应用(默认 `sqlite:///./subpilot.db`),bot token/SMTP password 敏感度中等,后续上云再加密;MVP 接受明文。

## Acceptance Criteria

### 后端数据模型
- [ ] `User` 表新增列并经 Alembic 迁移:`reminders_enabled`(bool,默认 true)、`reminder_days`(int,默认 3)、`reminder_email_enabled`(bool,默认 false)、`reminder_telegram_enabled`(bool,默认 false)、`telegram_chat_id`、`telegram_bot_token`、`smtp_host`、`smtp_port`、`smtp_user`、`smtp_password`(后五项可空)。
- [ ] `Subscription` 表新增列并经 Alembic 迁移:`acknowledged_billing_date`(Date,可空)。

### 定时扫描与发送
- [ ] 新增每日定时 job(复用现有 `BackgroundScheduler` 范式)扫描非 `cancelled` 订阅,窗口 `today <= next_billing_date <= today + reminder_days`,过期不动 `next_billing_date`、不发。
- [ ] `acknowledged_billing_date == next_billing_date` 的订阅跳过不发;`next_billing_date` 推进后二者不等即恢复提醒。
- [ ] `reminders_enabled=false` 的用户整体跳过;否则仅对已启用渠道独立发送。
- [ ] 窗口内未确认的订阅每天对每个已启用渠道各发一次(不去重)。
- [ ] 邮件渠道:用户 per-user SMTP(smtplib),收件人 `User.email`,配置缺失时跳过该渠道不影响他渠道。
- [ ] Telegram 渠道:httpx 调 Bot API,凭据缺失时跳过该渠道。
- [ ] 提醒文案按 `user.locale`(`en`/`zh-CN`)从文案字典取。

### 后端 API
- [ ] `POST /api/v1/subscriptions/{id}/acknowledge`:写 `acknowledged_billing_date = next_billing_date`,校验归属。
- [ ] 通知设置读写端点:`GET`/`PUT`(或 `PATCH /api/v1/auth/me/notifications`),保存 `reminders_enabled`/`reminder_days`/渠道开关与凭据。
- [ ] `POST .../notifications/test`:按指定渠道发一条测试消息,凭据无效返回错误码。

### 前端
- [ ] 设置页新增「提醒设置」卡片:总开关、`reminder_days`、邮件渠道(SMTP 凭据)、Telegram 渠道(token+chat_id),保存持久化。
- [ ] 保存渠道凭据后触发后端测试消息,失败提示。
- [ ] 订阅列表/卡片为窗口内未确认的订阅提供「确认已续费」按钮,点击调用 acknowledge 端点后该订阅从提醒列表移除。
- [ ] 所有新增 UI 文案经 react-i18next(`en`+`zh-CN`)。

## Out of Scope

- 渠道凭据加密存储(MVP 明文,上云后再做)。
- 过期后的补发提醒(严格按窗口,过期即沉默)。
- 第三方渠道(webhook / 钉钉 / 飞书等):MVP 仅邮件 + Telegram。
- Telegram bot 自动接收 `/start` 回写 chat_id 的 webhook 子系统(MVP 用户手填)。

## Open Questions

- 无(需求已收敛)。
