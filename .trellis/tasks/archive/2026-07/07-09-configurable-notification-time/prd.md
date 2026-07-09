# Configurable daily notification time

## Goal

Let each user choose a daily local clock time (and timezone) for subscription reminder notifications, so messages arrive at a predictable hour instead of whenever the server process started.

## Background

- Reminder settings live on `User` (master switch, `reminder_days`, channel flags/credentials) and are edited via `GET/PUT /auth/me/notifications` + Settings → Notifications.
- Sending is one APScheduler job: `interval days=1`, id `send_reminders` (`backend/app/main.py`). Fire time is process-relative, not a wall clock.
- `process_reminders` re-sends on every run for due, unacknowledged subscriptions. There is no per-day “already sent” marker; once-per-day behavior depends on the interval job.
- No user timezone field today; due windows use server-local `date.today()`.
- Per-subscription overrides exist for reminder **days**, not send time.

## Requirements

- **R1. User-global send time** — one preferred daily local time applies to all of that user’s reminders (not per-subscription).
- **R2. User timezone** — user configures an IANA timezone (e.g. `Asia/Shanghai`) that interprets the local send time and the local “today” used for due-window scanning.
- **R3. Precision** — send time is hour + minute (`HH:MM`).
- **R4. Defaults** — new and existing users default to `reminder_time=09:00`, `timezone=Asia/Shanghai` (migration/`server_default`).
- **R5. Settings surface** — Notifications card exposes editable send time + timezone; values persist through the existing notifications settings API.
- **R6. Delivery semantics** — for each user, reminders for a local calendar day are attempted once, at/after the preferred local time (not at process-start offset). Missed fire while the process is down is allowed to catch up later the same local day; must not re-spam later the same local day after a successful run attempt.
- **R7. Validation** — invalid `HH:MM` or unknown IANA timezone is rejected at write time (API 422).

## Acceptance Criteria

- [ ] **AC1** User can set and save `reminder_time` (`HH:MM`) and `timezone` (IANA) on Settings → Notifications; reload shows the saved values. (R1–R5)
- [ ] **AC2** New users and migrated existing users have defaults `09:00` / `Asia/Shanghai` until changed. (R4)
- [ ] **AC3** When local time reaches the preferred time and due unacknowledged subscriptions exist, reminders are sent on enabled channels. (R6)
- [ ] **AC4** After a run for a user on local date D, the same user is not processed again for reminders on local date D. (R6)
- [ ] **AC5** Due-window “today” is computed in the user’s timezone (not server-local date). (R2)
- [ ] **AC6** Invalid time or timezone on update returns 422 and does not persist. (R7)
- [ ] **AC7** i18n strings for the new fields exist in `en` and `zh-CN`. (R5)

## Out of scope

- Per-subscription send time
- Multiple daily windows / quiet hours / DND
- Digest vs per-subscription message format changes
- New notification channels
- Auto-detect browser timezone on first visit (fixed defaults only)
- Changing auto-renewal or exchange-rate job schedules

## Decisions (resolved)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | User-global |
| 2 | Timezone | User-selectable IANA |
| 3 | Precision | Hour + minute |
| 4 | Defaults | `09:00` / `Asia/Shanghai` |

## Notes

- Complex cross-layer task: `design.md` + `implement.md` required before `task.py start`.
