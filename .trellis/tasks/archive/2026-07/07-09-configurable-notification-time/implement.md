# Implement: Configurable daily notification time

## Checklist

### 1. Backend model + migration
- [ ] Add `reminder_time`, `timezone`, `last_reminder_local_date` to `User` model (`backend/app/models/user.py`)
- [ ] Alembic revision: defaults `"09:00"` / `"Asia/Shanghai"` / NULL; backfill existing rows via `server_default`

### 2. Schemas + API
- [ ] Extend `NotificationSettingsResponse` / `NotificationSettingsUpdate` with `reminder_time`, `timezone`
- [ ] Validators: `HH:MM` regex; IANA via `zoneinfo.ZoneInfo`
- [ ] Confirm `PUT /auth/me/notifications` generic setattr path picks up new fields (no channel-cred interaction)

### 3. Scanner + scheduler
- [ ] Update `process_reminders` with local-time gate, local-today due window, and `last_reminder_local_date` mark
- [ ] Change `send_reminders` job to `interval minutes=1`; call `_run_reminders()` once before `scheduler.start()` for catch-up
- [ ] Invalid stored tz/time: log warning + skip, never raise

### 4. Frontend
- [ ] Extend `NotificationSettings` type
- [ ] Settings Notifications card: time input + timezone select (curated list)
- [ ] i18n keys in `en.json` and `zh-CN.json`

### 5. Validation
- [ ] Manual or automated: save/load settings; invalid values 422
- [ ] Scanner unit-level reasoning / smoke: user before preferred time skipped; after time once; second tick same day skipped
- [ ] Lint/typecheck if project has standard commands

## Validation commands

```bash
# From backend/
cd backend && alembic upgrade head
# If tests exist for notifications, run them; otherwise smoke via API + logs
# From frontend/
cd frontend && npm run build   # or project’s typecheck/build script
```

## Risky files / rollback points

| Step | Risk | Rollback |
|------|------|----------|
| Migration | bad default / non-null without default | `alembic downgrade -1` |
| Scanner rewrite | re-spam or miss sends | revert scanner + keep daily job until fixed |
| 1-min job | load if many users (unlikely for this app) | bump interval to 5 min |

## Related files

- `backend/app/models/user.py`
- `backend/app/schemas/notification.py`
- `backend/app/routers/auth.py` (path only; may need no logic change)
- `backend/app/services/notifications/scanner.py`
- `backend/app/main.py`
- `frontend/src/api/types.ts`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/i18n/en.json`, `frontend/src/i18n/zh-CN.json`
- new `backend/alembic/versions/*_add_reminder_time_timezone.py`

## Pre-start gate

- [x] `prd.md` converged
- [x] `design.md` written
- [x] `implement.md` written
- [ ] `implement.jsonl` / `check.jsonl` curated (non-seed)
- [ ] User review / approval to `task.py start`
