# Design: Configurable daily notification time

## Summary

Add user-level `reminder_time` + `timezone`, run the reminder job frequently, and only process each user once per local calendar day at/after their preferred local time. Persist `last_reminder_local_date` for idempotency.

## Architecture

```
Settings UI ──PUT /auth/me/notifications──► User row
                                              │
APScheduler (every 1 min) ──► process_reminders(db)
                                 │
                                 ├─ for each reminders_enabled user
                                 ├─ local_now = now in user.timezone
                                 ├─ skip if local_now.time < reminder_time
                                 ├─ skip if last_reminder_local_date == local_today
                                 ├─ scan due subs using local_today as "today"
                                 ├─ send via existing channels
                                 └─ set last_reminder_local_date = local_today; commit
```

No per-user dynamic cron jobs. One shared job + filter keeps multi-user different times simple.

## Data model (`users`)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `reminder_time` | `String(5)` | `"09:00"` | Local `HH:MM` 24h |
| `timezone` | `String(64)` | `"Asia/Shanghai"` | IANA id |
| `last_reminder_local_date` | `Date` nullable | `NULL` | Last local date this user was processed for reminders; not exposed in API |

Alembic migration + model fields. `last_reminder_local_date` is internal scheduler state — omit from notification settings response/update schemas.

## API contract

Extend existing notification settings schemas (no new endpoints):

```text
NotificationSettingsResponse / Update:
  + reminder_time: str   # "HH:MM"
  + timezone: str        # IANA
```

Validation on write (`schemas/notification.py` and/or router):

- `reminder_time`: match `^([01]\d|2[0-3]):[0-5]\d$`
- `timezone`: `ZoneInfo(name)` succeeds; else 422

Existing channel credential validation unchanged.

## Scanner / scheduler

### Job registration (`main.py`)

Replace:

```python
scheduler.add_job(_run_reminders, "interval", days=1, id="send_reminders")
```

with:

```python
scheduler.add_job(_run_reminders, "interval", minutes=1, id="send_reminders")
_run_reminders()  # catch-up after restart (safe: per-user time + idempotency gates)
```

Renewals / exchange rates stay daily.

### `process_reminders` logic changes

For each `reminders_enabled` user:

1. Resolve `ZoneInfo(user.timezone)`; on invalid stored tz → `logger.warning` + skip (never raise in job).
2. `local_now = datetime.now(tz)`; `local_today = local_now.date()`; `local_t = local_now.time()` (seconds ignored for compare: use hour/minute only).
3. Parse `user.reminder_time` → `time(hour, minute)`. On parse failure → warn + skip.
4. If `local_t < preferred` → skip (not yet time).
5. If `user.last_reminder_local_date == local_today` → skip (already processed).
6. Due window uses **`local_today`** instead of `date.today()` (and `window_end = local_today + effective_days`).
7. Existing sub filters (status, ack, reminder_enabled, channels) unchanged.
8. After the user is fully handled (including “no channels / no due subs”), set `last_reminder_local_date = local_today` and `db.commit()` for that user so later ticks in the same local day no-op.

Commit per user (or batch commit after all users) is fine; prefer commit after each user so a later failure does not re-send earlier users.

### Edge cases

| Case | Behavior |
|------|----------|
| Process down over preferred time | Next tick after restart, if still same local day and `>= preferred`, catch-up send once |
| User changes time after already processed today | No second send that local day |
| User changes timezone | Next evaluation uses new tz; if local date already marked, skip until next local date |
| Invalid stored timezone/time | Skip + warn; do not crash scheduler |
| No channels / no due subs at fire time | Still mark `last_reminder_local_date` so we do not re-scan every minute |

## Frontend

`SettingsPage` Notifications card (after reminder days):

- **Send time**: `<Input type="time" />` bound to `reminder_time` (`HH:MM`)
- **Timezone**: `<Select>` of a curated common IANA list (include `Asia/Shanghai`, major zones); value is the IANA string

Types: extend `NotificationSettings` in `frontend/src/api/types.ts`.  
i18n: `notifications.reminderTime`, `notifications.timezone` in `en.json` + `zh-CN.json`.

## Compatibility

- Migration non-destructive; defaults backfill existing rows.
- API additive fields; clients that omit them on PUT leave values unchanged (`exclude_unset`).
- No change to message templates or channel send APIs.

## Trade-offs

| Choice | Why | Rejected alternative |
|--------|-----|----------------------|
| Shared 1-min job + filter | Simple multi-user different times | Per-user cron (job churn, harder with many users) |
| `last_reminder_local_date` on user | Minimal schema; one send attempt/day/user | Per-subscription last-sent (heavier, unnecessary for user-global time) |
| Curated TZ select | Enough for product; avoids huge combobox | Free-text IANA (error-prone UX) |
| Mark day even if 0 sends | Prevents 1-min busy loop | Only mark on message sent (re-query forever; enable-channel-same-day edge case rare) |

## Rollback

1. Revert code; leave columns in DB (harmless) or down-migration drop three columns.
2. Restore daily interval job if needed.
3. No external data migration beyond DB columns.
