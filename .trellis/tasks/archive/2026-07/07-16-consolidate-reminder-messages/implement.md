# Implement — 合并到期提醒为单条摘要消息

## 执行清单

### Step 1 — 重写 `templates.py`

- [ ] 将 `_TEMPLATES` 结构从 `subject` / `body` / `trial_body` 改为 `subject_multi` / `subject_single` / `body_header` / `item_normal` / `item_trial` / `body_footer`（en + zh-CN）。
- [ ] 重写 `render(locale, items)` 函数：
  - 签名：`render(locale: str, items: list[tuple[Subscription, int]]) -> tuple[str, str]`
  - `len(items) == 1` → `subject_single`（填 `{days}` `{name}`），否则 `subject_multi`（填 `{count}`）
  - body = `body_header` + 逐条 `item_normal`/`item_trial` + `body_footer`
  - 试用判断：`sub.status is not None and sub.status.value == "trial"`
  - 未知 locale 回退 `en`
- [ ] 验证：`python3 -c "from app.services.notifications.templates import render"` 导入无报错

### Step 2 — 改 `scanner.py` 发送循环

- [ ] 在 `for sub in subs` 循环中收集 `due_items: list[tuple[Subscription, int]]`，保留所有过滤逻辑（`reminder_enabled`、`reminder_mode`、`effective_days`、`window_end`）不变。
- [ ] 循环结束后：`due_items.sort(key=lambda x: x[1])`（剩余天数升序）。
- [ ] 调用 `render(locale, due_items)` 一次，逐渠道 `channel.send` 一次。
- [ ] `sent_count += 1` 每渠道成功一次（而非每订阅）。
- [ ] 发送失败日志改为 `"Failed sending %s reminder for user %s (%d subscriptions)", channel.name, user.id, len(due_items)`。

### Step 3 — 验证

- [ ] `cd backend && python3 -m pytest tests/ -x`（现有测试不回归）
- [ ] `cd backend && python3 -c "from app.services.notifications import process_reminders; print('ok')"`（导入链无报错）
- [ ] 手动模拟：构造 2+ 条到期订阅，调用 `process_reminders`，确认只发送 1 条消息（检查 mock channel 调用次数）

## 验证命令

```bash
cd backend && python3 -m pytest tests/ -x
cd backend && python3 -c "from app.services.notifications import process_reminders; print('ok')"
cd backend && python3 -c "from app.services.notifications.templates import render; print('ok')"
```

## 风险文件

- `backend/app/services/notifications/templates.py` — render 签名变更，需确认无其他调用方（已确认仅 scanner.py）
- `backend/app/services/notifications/scanner.py` — 发送循环重构

## 回滚点

- 改动集中在单个 commit，`git revert` 即可恢复。