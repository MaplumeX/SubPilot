# Design — Subscription due-date reminders

## 架构与边界

新增一个 `notifications` 子系统,与现有 `renewal` 服务并列(见 `backend/app/services/renewal.py` 范式)。

```
backend/app/
├── models/
│   ├── user.py            # 加列:提醒开关 / 阈值 / 渠道凭据
│   └── subscription.py    # 加列:acknowledged_billing_date
├── services/
│   ├── renewal.py         # 已有,不动
│   └── notifications/
│       ├── __init__.py
│       ├── scanner.py     # process_reminders(db):扫描 + 分发
│       ├── channels.py    # EmailChannel / TelegramChannel + Channel 协议
│       └── templates.py   # 按 user.locale 的文案字典
├── routers/
│   ├── auth.py            # 已有;复用 /me patch 范式加 notifications 设置端点
│   └── subscriptions.py   # 加 POST /{id}/acknowledge
├── schemas/
│   └── notification.py    # NotificationSettings 读写 schema
└── main.py                # 注册 _run_reminders 日度 job
```

`Channel` 协议(鸭子类型,最小接口):

```python
class Channel:
    name: str
    def send(self, *, to: str, subject: str, body: str) -> None: ...
    def test(self, *, user: User) -> None: ...  # 发测试消息,失败抛异常
```

`EmailChannel` 持有 per-user SMTP 凭据(从 `User` 取),`TelegramChannel` 持有 per-user bot token + chat_id。两个 channel 无共享可变状态,天然可并行/可扩展。

## 数据流

### 1. 每日扫描 job(`_run_reminders`)

复用 `main.py` 现有 `BackgroundScheduler` 范式,新增 job `id="send_reminders"`,`interval days=1`。

```
process_reminders(db):
  today = date.today()
  for user in users where reminders_enabled == True:
    window_end = today + user.reminder_days
    subs = db.query(Subscription)
      .filter(
        user_id == user.id,
        status != cancelled,                       # active + trial
        next_billing_date.isnot(None),
        next_billing_date >= today,                 # 过期不发
        next_billing_date <= window_end,
        or_(acknowledged_billing_date.is_(None),
            acknowledged_billing_date != next_billing_date),  # 已确认则跳过
      ).all()
    if not subs: continue
    channels = build_channels(user)   # 仅 enabled 且凭据齐全的
    for sub in subs:
      for ch in channels:
        try: ch.send(...)
        except: logger.exception(...)   # 单渠道失败不阻断其他
```

关键点:
- **job 只读,不 commit**。写操作(acknowledge)由独立 API 负责,避免网络 IO 混入事务。
- 单订阅/单渠道发送失败只 `logger.exception`,不影响后续。
- job 级整体 try/except(与 `_run_renewals` 一致),避免任何异常搞垮 scheduler。

### 2. 与 `process_renewals` 的执行顺序

两个日度 job 都 `days=1`,执行先后无关正确性:
- 若 `acknowledged_billing_date == next_billing_date`(用户已确认本周期),`process_reminders` 跳过;无论 renewals 是否当天推进,acknowledged 与新/旧 `next_billing_date` 都不再同时相等到「当前周期」语义之外 —— 下个周期 `next_billing_date` 推进后二者不等,自动恢复提醒。
- 结论:**无需协调两 job 顺序**。

### 3. acknowledge API

```
POST /api/v1/subscriptions/{id}/acknowledge
  -> subscription.acknowledged_billing_date = subscription.next_billing_date
  -> db.commit()
```
校验归属复用 `_check_ownership`。不动 `next_billing_date`。

### 4. 通知设置 API

复用 `auth.py` 现有 `PATCH /me/locale` 风格,但用 body(字段多):

```
GET  /api/v1/auth/me/notifications      -> NotificationSettings
PUT  /api/v1/auth/me/notifications      -> 保存设置(含凭据)
POST /api/v1/auth/me/notifications/test  body: {channel: "email"|"telegram"}
                                        -> 用当前保存的凭据发测试,失败 400
```

PUT 时若某渠道 enabled 但凭据缺失 → 422。

## 数据模型变更(Alembic migration)

### `users` 加列

```python
reminders_enabled        Boolean  default True  server_default text("1")
reminder_days            Integer  default 3
reminder_email_enabled   Boolean  default False server_default text("0")
reminder_telegram_enabled Boolean default False server_default text("0")
telegram_chat_id         String(64)  nullable
telegram_bot_token       String(256) nullable
smtp_host                String(255) nullable
smtp_port                Integer     nullable
smtp_user                String(255) nullable
smtp_password            String(255) nullable
```

### `subscriptions` 加列

```python
acknowledged_billing_date  Date  nullable
```

迁移照搬 `5e32eb486ac7_add_auto_renew_to_subscriptions` 的 `add_column` + `server_default` 范式; nullable 项无 server_default。一张迁移文件涵盖两张表。

**兼容性**:全为新增 nullable / 有 server_default 列,旧数据自动得到默认值(`reminders_enabled=True` 即现有用户默认开启提醒总开关;但两个渠道默认 False,需用户主动配置凭据后启用 —— 不会突然对现有用户发垃圾)。

## 渠道实现细节

### EmailChannel(smtplib,标准库,无需新依赖)

```python
with smtplib.SMTP(host, port, timeout=...) as s:
    if port != 25: s.starttls()      # 587/465 常见;465 走 SMTP_SSL
    if user: s.login(user, password)
    s.sendmail(from_addr=user, to_addrs=[to], msg=...)
```
- 端口策略:`port == 465` → `smtplib.SMTP_SSL`;否则 `SMTP` + `starttls()`。覆盖主流邮箱(Gmail 587、QQ 465/587)。
- 收件人 = `User.email`;发件人 = `smtp_user`(多数 SMTP 要求 from == 认证账号)。

### TelegramChannel(httpx,已是依赖)

```
POST https://api.telegram.org/bot{token}/sendMessage
  body: {chat_id, text}
```
`httpx.Client` 短超时(10s),非 200 响应抛异常。

### templates.py(文案字典,按 locale)

```python
TEMPLATES = {
  "en": {"subject": "...", "body": "...", "trial_body": "..."},
  "zh-CN": {...},
}
def render(locale, sub) -> (subject, body):
  key = "trial_body" if sub.status == trial else "body"
  return TEMPLATES.get(locale, TEMPLATES["en"]) ...
```
仅 en / zh-CN 两套,文案量小。未知 locale 兜底 en。

## 前端

### 设置页加「提醒设置」卡片(`SettingsPage.tsx`)

仿现有语言/货币 Card 范式,包含:
- 总开关 `reminders_enabled`(Switch)
- 提前天数 `reminder_days`(Select: 1/3/7/14)
- 邮件渠道:`reminder_email_enabled`(Switch)+ SMTP host/port/user/password(Input,密码 type=password)
- Telegram 渠道:`reminder_telegram_enabled`(Switch)+ bot_token / chat_id(Input)
- 每个渠道旁「发送测试」按钮 → 调 `POST .../test`
- 保存 → `PUT .../notifications`

#### 订阅「确认已续费」按钮(`SubscriptionsPage` + `SubscriptionCard`)

- 表格视图与卡片视图均在操作列加按钮,条件:`isDueSoon(sub)` 且 `sub.acknowledged_billing_date != sub.next_billing_date`。
- 点击 → `POST .../acknowledge` → 局部更新该行(本地 set acknowledged_billing_date),不必整页 reload。
- 附带:`isDueSoon` 改用用户的 `reminder_days`(从设置读到,存前端 state),与后端窗口口径一致,替换现有硬编码 3 天。

### i18n

`zh-CN.json` + `en` 对应文件加 `notifications.*` 与 `subscriptions.acknowledge` / `subscriptions.acknowledged` 命名空间。

## 权衡

- **凭据明文存 SQLite**:MVP 接受(本地单机)。上云再加 Fernet 加密(需要 KMS/密钥)。design 不预先实现加密,符合简洁优先。
- **渠道凭据存 User 加列而非子表**:渠道少(2 个)时单表更简单;加列式迁移与 `base_currency` 一致。若未来渠道数膨胀到 5+ 再重构为 `NotificationChannel` 子表。
- **acknowledged 标记法 vs 推进日期法**:选 acknowledged 避免与 `process_renewals` 双重推进冲突(见 PRD rationale)。
- **不去重、每天发**:用户明确要求。代价是窗口内连发,但已被「确认已续费」停发机制覆盖,可接受。

## 运维 / 回滚

- 回滚:drop 新列(migration 有 downgrade)。scheduler job 删除 job 即停用提醒。前端新卡片移除即可。
- 观测:`process_reminders` 内 `logger.info("Sent %d reminder(s)", n)`,失败 `logger.exception`。
- 凭据变更即时生效:job 每次运行重新从 DB 读 user,无缓存,配置改完次日生效(或手动触发 test 端点即时验证)。
