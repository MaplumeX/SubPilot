# Design — 合并到期提醒为单条摘要消息

## 改动边界

仅涉及 `backend/app/services/notifications/` 子包内部：
- `templates.py` — 重写模板结构 + `render` 签名
- `scanner.py` — 改发送循环为「先聚合再单次发送」

不改动：
- `channels.py` — `Channel.send(*, subject, body)` 协议不变
- `schemas/notification.py` — 无 API 变化
- 前端 — 无变化
- DB / Alembic — 无变化

## 数据流

```
process_reminders(db)
  for user in users:
    subs = filter_due_subs(user)          # 不变
    due_items = []                        # 新：聚合列表
    for sub in subs:
      ...effective_days/window 过滤不变...
      due_items.append((sub, days))
    # 排序：剩余天数升序
    due_items.sort(key=lambda x: x[1])
    if due_items:
      subject, body = render(locale, due_items)   # 新签名
      for channel in channels:
        channel.send(subject=subject, body=body)  # 每渠道只调一次
```

## templates.py 重设计

### 模板结构

从「单条订阅模板」改为「摘要列表模板」。模板分为三部分：`subject_multi`、`subject_single`、`body`。

```python
_TEMPLATES = {
    "zh-CN": {
        "subject_multi": "【SubPilot】您有 {count} 笔订阅即将到期",
        "subject_single": "【SubPilot】订阅即将到期（{days} 天）：{name}",
        "body_header": "您好，\n\n以下 {count} 笔订阅即将到期，请确认是否需要续费或取消：\n",
        "item_normal": (
            "{idx}. {name}\n"
            "   到期日：{date}（剩余 {days} 天）\n"
            "   金额：{currency} {price}\n"
        ),
        "item_trial": (
            "{idx}. {name}（试用）\n"
            "   到期日：{date}（剩余 {days} 天）\n"
            "   如不取消将转为付费订阅。\n"
        ),
        "body_footer": "\n如已处理，请在 SubPilot 中标记为已确认，即可停止提醒。\n",
    },
    "en": { ... 对应英文 ... },
}
```

### render 新签名

```python
def render(locale: str, items: list[tuple[Subscription, int]]) -> tuple[str, str]:
    """Render (subject, body) for a list of due subscriptions.

    items: list of (subscription, days_remaining), pre-sorted by days ascending.
    Unknown locale falls back to English.
    """
```

- `items` 非空（调用方保证）。
- `subject`：`len(items) == 1` 时用 `subject_single`（填 `{days}` `{name}`），否则 `subject_multi`（填 `{count}`）。
- `body`：`body_header`（填 `{count}`）+ 逐条 `item_normal` / `item_trial`（填 `{idx}` `{name}` `{date}` `{days}` `{currency}` `{price}`）+ `body_footer`。
- 试用判断不变：`sub.status is not None and sub.status.value == "trial"`。

## scanner.py 改动

当前循环（简化）：
```python
for sub in subs:
    ...
    subject, body = render(locale, sub, days)
    for channel in channels:
        channel.send(subject=subject, body=body)
```

改为：
```python
due_items: list[tuple[Subscription, int]] = []
for sub in subs:
    ...过滤不变...
    days = (sub.next_billing_date - local_today).days
    due_items.append((sub, days))

if due_items and channels:
    due_items.sort(key=lambda x: x[1])
    locale = user.locale or "en"
    subject, body = render(locale, due_items)
    for channel in channels:
        try:
            channel.send(subject=subject, body=body)
            sent_count += 1
        except Exception:
            logger.exception(
                "Failed sending %s reminder for user %s (%d subscriptions)",
                channel.name, user.id, len(due_items),
            )
```

### 日志格式变化

- 旧：`"Failed sending %s reminder for subscription %s to user %s", channel.name, sub.id, user.id`
- 新：`"Failed sending %s reminder for user %s (%d subscriptions)", channel.name, user.id, len(due_items)`

理由：合并后一次发送关联多个订阅，无法再记单个 `sub.id`；记 `sub_count` 保留排障信息量。

## 兼容性

- `render` 签名变更（`sub, days` → `items`），但 `render` 仅被 `scanner.py` 调用（grep 确认无其他调用方），无外部 API 暴露。
- `Channel.send` 签名不变，渠道层零改动。
- `test()` 走 `channel.test()` 独立路径，不经过 `render`，不受影响。

## 风险与回滚

- 风险低：改动范围小（2 文件），无 DB / API 变化。
- 回滚：`git revert` 单个 commit 即可恢复逐条发送。