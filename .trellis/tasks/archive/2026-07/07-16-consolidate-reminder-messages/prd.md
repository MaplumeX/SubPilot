# 合并到期提醒为单条摘要消息

## Goal

将到期提醒从「逐条发送」改为「合并为单条摘要消息」：同一用户在同一提醒触发时刻有多条订阅到期时，只发送一条包含所有到期订阅的摘要消息（邮件一封 / Telegram 一条），而非当前的 N 条独立消息。

## User Value

- 减少消息刷屏：多条订阅同时到期时，Telegram 不再连续弹 N 条消息，邮件收件箱不再被 N 封独立邮件淹没。
- 信息聚合：用户一眼看到所有即将到期的订阅，便于统筹决策（哪些续费、哪些取消）。

## Background（当前现状，来自代码勘察）

- 扫描入口 `backend/app/services/notifications/scanner.py:process_reminders`：
  - 逐用户 → 逐订阅 → `render(locale, sub, days)` 生成 `(subject, body)` → 逐渠道 `channel.send(subject=subject, body=body)`。
  - 即 N 条订阅 × M 个渠道 = N×M 次发送，每条独立 subject+body。
- 模板 `backend/app/services/notifications/templates.py`：
  - 现有结构是单条订阅维度：`subject` 含 `{days}` `{name}`，`body`/`trial_body` 含 `{name}` `{date}` `{days}` `{currency}` `{price}`。
  - `render(locale, sub, days) -> tuple[str, str]` 输入是单个 `Subscription`。
  - 支持 `en` / `zh-CN`，未知 locale 回退 `en`；试用订阅走 `trial_body`（不显示金额行）。
- 渠道 `backend/app/services/notifications/channels.py`：
  - `Channel.send(*, subject, body)` 协议——邮件 subject 作为邮件主题、body 作为纯文本正文；Telegram 拼成 `subject\n\nbody` 纯文本发送。
  - `EmailChannel`：纯文本 `EmailMessage.set_content(body)`，无 HTML。
  - `TelegramChannel`：`sendMessage` 无 `parse_mode`，纯文本。
- 测试消息 `test()` 走独立固定文案，不受本次改动影响。
- 后端无通知/模板相关测试（`backend/tests/` 仅 `test_contracts.py`）。
- Spec 参考：
  - `.trellis/spec/backend/directory-structure.md` 记录了 notifications 子包结构。
  - `.trellis/spec/guides/cross-layer-thinking-guide.md` 「Notification Settings: Two-Layer Credential Contract」清单。
  - `.trellis/spec/backend/logging-guidelines.md`：发送失败日志格式 `channel.name, sub.id, user.id`。

## Requirements

### R1 — 合并发送

- 同一用户在同一提醒触发时刻，所有命中提醒窗口的订阅合并为**一条**消息发送（邮件一封 / Telegram 一条）。
- `Channel.send(*, subject, body)` 协议不变——改动在 scanner 层聚合后调用，渠道层无需修改。

### R2 — 摘要模板

- 统一使用摘要模板，单条订阅时自然退化为列表仅一项（不再保留独立的单条模板分支）。
- 摘要消息结构：
  - **Subject**（多条）：`【SubPilot】您有 {count} 笔订阅即将到期`
  - **Subject**（单条退化为当前风格）：`【SubPilot】订阅即将到期（{days} 天）：{name}`
  - **Body**：
    - 开头问候 + 概述句（`以下 {count} 笔订阅即将到期，请确认是否需要续费或取消：`）
    - 逐条列出：序号、名称（试用订阅追加「（试用）」标注）、到期日、剩余天数、金额行（试用订阅无金额行，改为`如不取消将转为付费订阅。`）
    - 结尾固定提示句（`如已处理，请在 SubPilot 中标记为已确认，即可停止提醒。`）
- 订阅列表按**剩余天数升序**排列（最紧急的在前）。
- 保留 `en` / `zh-CN` 双语模板，未知 locale 回退 `en`。

### R3 — 不变项

- `test()` 测试消息不受影响，保持现有固定文案。
- `Channel.send` / `Channel.test` 签名不变。
- 过滤逻辑（`reminder_enabled`、`reminder_mode`、`effective_days`、`acknowledged_billing_date` 跳过）不变。

### R4 — 计数与日志

- `process_reminders` 返回值 `sent_count` 语义调整为「发送的消息条数」（合并后 = 成功发送的渠道数 × 1，而非当前的订阅数 × 渠道数）。
- 发送失败日志：合并后不再关联单个 `sub.id`，改为记录 `channel.name, user.id, sub_count`（当前格式 `channel.name, sub.id, user.id` 不再适用）。

## Acceptance Criteria

- [ ] AC1：同一用户有 ≥2 条订阅在提醒窗口内时，每个已启用渠道只发送一条消息（邮件一封 / Telegram 一条），而非 N 条。
- [ ] AC2：摘要消息包含所有命中订阅的信息（名称、到期日、剩余天数、金额；试用订阅标注试用且无金额行）。
- [ ] AC3：订阅列表按剩余天数升序排列。
- [ ] AC4：仅 1 条订阅到期时，subject 退化为 `【SubPilot】订阅即将到期（{days} 天）：{name}`，body 为仅一项的列表（信息量不少于当前单条消息）。
- [ ] AC5：`en` / `zh-CN` 双语模板均正确渲染，未知 locale 回退 `en`。
- [ ] AC6：`test()` 测试消息文案不变。
- [ ] AC7：`process_reminders` 返回值为成功发送的消息条数（非 N×M）。
- [ ] AC8：发送失败日志格式更新为 `channel.name, user.id, sub_count`（不再记单个 `sub.id`）。

## Out of Scope

- 渠道凭据加密存储。
- 新增通知渠道。
- 前端通知设置 UI 改动。
- 日期格式本地化（如 `7 月 21 日` vs `2026-07-21`）。
- Telegram Markdown / HTML 排版 / inline 按钮。