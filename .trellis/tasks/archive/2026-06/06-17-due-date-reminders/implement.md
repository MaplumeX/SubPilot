# Implement — Subscription due-date reminders

执行前:`task.py start` 前用户已审阅 prd.md / design.md。

## 执行清单(按依赖顺序)

### Phase A — 后端数据层(阻塞后续所有后端工作)
1. `backend/app/models/user.py`:`User` 加 `reminders_enabled`、`reminder_days`、`reminder_email_enabled`、`reminder_telegram_enabled`、`telegram_chat_id`、`telegram_bot_token`、`smtp_host`、`smtp_port`、`smtp_user`、`smtp_password`。
2. `backend/app/models/subscription.py`:`Subscription` 加 `acknowledged_billing_date: Mapped[date | None]`。
3. 生成 Alembic 迁移:`cd backend && alembic revision --autogenerate -m "add reminder settings and acknowledged_billing_date"`,核对迁移含两张表的新列、`reminders_enabled` 有 `server_default text("1")`、两个渠道开关 `server_default text("0")`、`reminder_days` default 3。
4. `alembic upgrade head` 验证。

### Phase B — 通知服务层
5. `backend/app/services/notifications/templates.py`:`TEMPLATES` dict(en + zh-CN),`render(locale, sub)` 返回 (subject, body)。trial 用单独 body。
6. `backend/app/services/notifications/channels.py`:
   - `Channel` 鸭子协议(`send`、`test`)。
   - `EmailChannel`(smtplib;端口 465 走 SMTP_SSL,其余 SMTP+starttls;from=smtp_user;to=user.email)。
   - `TelegramChannel`(httpx POST sendMessage)。
   - `build_channels(user)`:`reminders_enabled` + 各渠道 enabled + 凭据齐全 才返回该 channel。
7. `backend/app/services/notifications/scanner.py`:`process_reminders(db)` 按 design 数据流实现;每个 user 构 channels、对窗口内未确认订阅逐渠道 send,单失败 `logger.exception`。
8. `backend/app/services/notifications/__init__.py`:导出 `process_reminders`。

### Phase C — 调度接入
9. `backend/app/main.py`:加 `_run_reminders`(仿 `_run_renewals`),`scheduler.add_job(_run_reminders, "interval", days=1, id="send_reminders")`。

### Phase D — 后端 API
10. `backend/app/schemas/notification.py`:`NotificationSettingsResponse`(from_attributes)、`NotificationSettingsUpdate`(全可选字段)、`TestChannelRequest`。已启用渠道缺凭据时校验失败。
11. `backend/app/schemas/subscription.py`:`SubscriptionResponse` 加 `acknowledged_billing_date: date | None`。
12. `backend/app/routers/subscriptions.py`:加 `POST /{subscription_id}/acknowledge`(写 acknowledged_billing_date=next_billing_date,**不动 next_billing_date**,归属校验)。
13. `backend/app/routers/auth.py`:加 `GET /me/notifications`、`PUT /me/notifications`、`POST /me/notifications/test`(前者 GET 读现值;PUT 写;test 用现保存凭据发测试,失败 400)。
14. `backend/app/schemas/auth.py`:`UserResponse` 不必加新字段(通知设置独立端点),保持兼容。

### Phase E — 前端类型与 API
15. `frontend/src/api/types.ts`:`Subscription` 加 `acknowledged_billing_date`;新增 `NotificationSettings` 接口。
16. `frontend/src/api/notifications.ts`(新):`getNotificationSettings`、`updateNotificationSettings`、`testNotificationChannel`、`acknowledgeSubscription`(放 subscriptions.ts 也可,选其一放)。
17. `frontend/src/api/subscriptions.ts`:加 `acknowledgeSubscription(id)`。

### Phase F — 前端 UI
18. `frontend/src/pages/SettingsPage.tsx`:加「提醒设置」Card(总开关、reminder_days、邮件渠道开关+SMTP 4 字段、Telegram 渠道开关+token+chat_id、每渠道测试按钮)。onMount 拉 settings,保存 PUT,测试调 test 端点。
19. `frontend/src/components/SubscriptionCard.tsx` + `frontend/src/pages/SubscriptionsPage.tsx`:表格/卡片视图加「确认已续费」按钮,条件 `isDueSoon(sub) && acknowledged != next_billing_date`;点击调 acknowledge 后本地更新 acknowledged 字段。
20. `SubscriptionsPage.isDueSoon`:窗口口径改用用户 `reminder_days`(从 settings 读),去掉硬编码 3。
21. i18n:`zh-CN.json` 与对应 `en` 文件加 `notifications.*`、`subscriptions.acknowledge`、`subscriptions.acknowledged` 等文案。

## 验证命令

```bash
# 后端
cd backend
alembic upgrade head                                  # 迁移成功
python -c "from app.services.notifications.scanner import process_reminders"  # 导入无误
# 启动后端,手动验证:
#   - GET /api/v1/auth/me/notifications 默认值
#   - PUT 写入设置 + POST .../test 测试消息(需真实 TG bot / SMTP)
#   - POST /subscriptions/{id}/acknowledge 后字段更新
#   - 手动跑 process_reminders(SessionLocal()) 观察日志/收件

# 前端
cd frontend
npm run lint
npm run build      # tsc -b && vite build 全过
# 启动 dev,设置页配置、订阅页确认按钮、i18n 两语言切换
```

## 风险点 / 回滚

- **凭据明文**:design 已说明 MVP 接受,上云再加密。不要为加密加半成品代码。
- **acknowledge 必须只写 acknowledged_billing_date,绝不推进 next_billing_date** —— 推进会与 `process_renewals` 双推进冲突。review 重点查此处。
- **scheduler 漏跑**:日度 job 若当天没启动,当天提醒丢失(符合既定「不去重、过期不补」设计,不做补偿)。
- 回滚:`alembic downgrade -1`;删 scheduler job;前端移除卡片;字段为 nullable/有默认值,不影响旧数据。

## 跨层一致性检查(收尾)

- 后端 `SubscriptionResponse.acknowledged_billing_date` ←→ 前端 `Subscription.acknowledged_billing_date` 字段名/类型一致。
- 前端 `isDueSoon` 窗口口径 == 后端 `process_reminders` 窗口口径(均 `today <= next <= today+reminder_days`),避免「按钮显示了却收不到提醒」错配。
- 通知设置字段名前后端一一对应。
