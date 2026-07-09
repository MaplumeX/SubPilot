# Cross-Layer Thinking Guide

> **Purpose**: Think through data flow across layers before implementing.

---

## The Problem

**Most bugs happen at layer boundaries**, not within layers.

Common cross-layer bugs:
- API returns format A, frontend expects format B
- Database stores X, service transforms to Y, but loses data
- Multiple layers implement the same logic differently

---

## Before Implementing Cross-Layer Features

### Step 1: Map the Data Flow

Draw out how data moves:

```
Source → Transform → Store → Retrieve → Transform → Display
```

For each arrow, ask:
- What format is the data in?
- What could go wrong?
- Who is responsible for validation?

### Step 2: Identify Boundaries

| Boundary | Common Issues |
|----------|---------------|
| API ↔ Service | Type mismatches, missing fields |
| Service ↔ Database | Format conversions, null handling |
| Backend ↔ Frontend | Serialization, date formats |
| Component ↔ Component | Props shape changes |

### Step 3: Define Contracts

For each boundary:
- What is the exact input format?
- What is the exact output format?
- What errors can occur?

---

## Common Cross-Layer Mistakes

### Mistake 1: Implicit Format Assumptions

**Bad**: Assuming date format without checking

**Good**: Explicit format conversion at boundaries

### Mistake 2: Scattered Validation

**Bad**: Validating the same thing in multiple layers

**Good**: Validate once at the entry point

### Mistake 3: Leaky Abstractions

**Bad**: Component knows about database schema

**Good**: Each layer only knows its neighbors

---

## Checklist for Cross-Layer Features

Before implementation:
- [ ] Mapped the complete data flow
- [ ] Identified all layer boundaries
- [ ] Defined format at each boundary
- [ ] Decided where validation happens

After implementation:
- [ ] Tested with edge cases (null, empty, invalid)
- [ ] Verified error handling at each boundary
- [ ] Checked data survives round-trip

---

## Duplicated Date/Range Logic: One Semantics, Two Implementations

When a date filter or window (e.g., "subscriptions due within N days") is needed both **backend** (a scheduled scanner) and **frontend** (a "due soon" badge/button gate), the logic gets written twice. The trap is letting them drift: badge shows "due soon" but the backend never sends a reminder (or vice-versa), because one side hardcoded `3` while the other reads `user.reminder_days`.

### Checklist: Before shipping a dual-implemented range

- [ ] Both sides use the **same source of truth** for the threshold — if it's user-configurable, both fetch it; do not hardcode `3` on one side as a "default".
- [ ] Both sides use the **same window semantics** — `[today, today+N]` inclusive vs exclusive at the boundaries matters on the exact due day.
- [ ] Both sides normalize `today` the same way (date-only, no time-of-day) — `new Date()` includes time; a `next_billing_date` at midnight can fail `next >= now` on the frontend while the backend's `date.today()` includes it.
- [ ] Field names match exactly across the response schema and the TS type (e.g., `acknowledged_billing_date`) — a typo on one side makes the suppression check silently no-op.

**Real-world example (this repo)**: `Stats.due_soon` hardcoded a 3-day window; the frontend `isDueSoon` also hardcoded 3. When reminders became user-configurable (`reminder_days`), the frontend badge had to switch to reading `reminder_days` too — otherwise it would show "due soon" for a 7-day user on a sub 5 days out, whose backend would indeed remind at 7 days, but the badge's 3-day gate hides the real window from the user.

> Note: `Stats.due_soon` in `routers/subscriptions.py` still hardcodes `timedelta(days=3)` for the dashboard "due soon" list, while the **reminder scanner** (`services/notifications/scanner.py`) uses the user's `reminder_days`. These are intentionally two different windows (dashboard preview vs. reminder send), but if you change one, confirm the other still makes sense — see the checklist above.

---

## Notification Settings: Two-Layer Credential Contract

Reminder channels (email/Telegram) are a cross-layer feature: settings written via `PUT /auth/me/notifications`, credentials validated and used by the scheduled scanner, messages rendered from locale templates and sent via channel clients. The contract spans API → DB → background job → external service.

### Checklist: When touching notification/reminder settings

- [ ] Enabling a channel is a **two-field contract** (the `<channel>_enabled` switch AND its credentials). The API validates completeness at write time (`_validate_channel_credentials` → 422); the scanner defends in depth at runtime (`build_channels` catches `ValueError`, warns, skips — never raises inside the job).
- [ ] Blank strings must normalize to `None` before storage so the "incomplete creds" check works — see `_blank_to_none` field validator in `schemas/notification.py`.
- [ ] Render locale via `user.locale or "en"` (English fallback), and any new locale needs matching template keys in `services/notifications/templates.py`.
- [ ] Never log credentials — log channel name + ids only (see [Logging Guidelines](../backend/logging-guidelines.md)).
- [ ] **Send time is user-local**: `User.reminder_time` (`HH:MM`) + `User.timezone` (IANA). API validates both at write time (`schemas/notification.py`); scanner uses them for the local-time gate and local-today due window. Do **not** reintroduce server `date.today()` for reminder windows.
- [ ] **Once-per-local-day idempotency** lives on `User.last_reminder_local_date` (internal, not in API schemas). If the job runs more often than daily, any change that removes this marker will re-spam. Mark after handling a user even when 0 messages are sent.
- [ ] Frontend `<input type="time">` must normalize to `HH:MM` (`step={60}` + `.slice(0, 5)`); some browsers emit `HH:MM:SS` which fails backend validation.

Reference files: `backend/app/routers/auth.py`, `backend/app/schemas/notification.py`, `backend/app/services/notifications/{scanner,channels,templates}.py`, `frontend/src/pages/SettingsPage.tsx`.

---

## When to Create Flow Documentation

Create detailed flow docs when:
- Feature spans 3+ layers
- Multiple teams are involved
- Data format is complex
- Feature has caused bugs before
