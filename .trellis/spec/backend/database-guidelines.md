# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

- **ORM**: SQLAlchemy (sync mode) with declarative base
- **Migrations**: Alembic with autogenerate
- **Database**: SQLite (dev), migratable to PostgreSQL
- **Session management**: Dependency injection via `get_db` in `deps.py`

---

## Query Patterns

- Use `db.query(Model).filter()` style queries
- Always filter by `user_id` for ownership-scoped queries
- Use `.isnot(None)` instead of `!= None` for null checks
- Use `db.execute(select(...))` or `db.query(...)` consistently — prefer `db.query()` for simplicity

---

## Migrations

```bash
# After adding/changing a model:
cd backend
alembic revision --autogenerate -m "description of change"
alembic upgrade head
```

- Import ALL models in `alembic/env.py` so autogenerate detects them
- Dev convenience: `main.py` lifespan also calls `Base.metadata.create_all(bind=engine)` to auto-create tables

---

## Naming Conventions

- Table names: plural of model class lowercase (auto-derived from class name)
- Column names: snake_case
- Foreign keys: `<entity>_id` (e.g., `user_id`)
- Indexes: add `index=True` on frequently queried columns (user_id, email)

---

## Sorting on List Endpoints

When adding sorting to a list endpoint:

- Use `sort_by` + `sort_order` query params with **whitelist validation** (prevent SQL injection)
- Validate `sort_by` against a set of allowed field names; return 400 on invalid values
- Validate `sort_order` as `"asc"` or `"desc"`; default to `"asc"` when `sort_by` is provided without `sort_order`
- Default sort (no params): preserve current behavior (e.g., `created_at.desc()`)

```python
SORTABLE_FIELDS = {"name", "converted_price", "next_billing_date"}

@router.get("")
def list_items(
    sort_by: str | None = Query(None),
    sort_order: str | None = Query(None),
    ...
):
    if sort_by is not None and sort_by not in SORTABLE_FIELDS:
        raise HTTPException(status_code=400, detail=f"Invalid sort_by field: {sort_by}")
    if sort_order is not None and sort_order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="sort_order must be 'asc' or 'desc'")
```

- For **nullable columns** (e.g., `next_billing_date`), always use `.nullslast()` in both sort directions — nulls at the top confuse users

```python
col = Subscription.next_billing_date
if sort_order == "asc":
    query = query.order_by(col.asc().nullslast())
else:
    query = query.order_by(col.desc().nullslast())
```

- For **computed fields** not in the DB (e.g., `converted_price = price * rate`), build a SQL expression with JOIN + CASE instead of sorting in Python. Use a subquery to get the latest rate per currency pair, then JOIN on the result.

---

## Common Mistakes

- **Forgetting to import models in `alembic/env.py`** → autogenerate won't detect changes
- **Using `datetime.utcnow()`** → deprecated; use `datetime.now(timezone.utc)` via a `_utcnow` helper
- **Using `!= None`** → SQLAlchemy doesn't translate this correctly; use `.isnot(None)`
- **Missing `ondelete="CASCADE"`** on ForeignKey → orphaned records in SQLite when parent is deleted
- **Adding CHECK constraints with plain ALTER TABLE** → not supported by SQLite; use `batch_alter_table` with `create_check_constraint` instead
- **Replacing an enum column with multiple columns** → migrate data first (add new cols → UPDATE data → drop old col), and use `batch_alter_table` for cross-dialect compatibility
- **Replacing a free-text string column with a per-user entity FK** (e.g. `subscriptions.category String` → `category_id FK -> categories.id`) — dev-stage pattern, no compat layer. Ordered migration: (1) `create_table` the entity with `UniqueConstraint(user_id, name)`; (2) `add_column` new `*_id` columns as **nullable first** so backfill can run; (3) backfill entities via `INSERT ... SELECT DISTINCT user_id, <string_col>, NOW() FROM subscriptions WHERE <col> IS NOT NULL AND <col> <> ''`; (4) backfill FK with correlated `UPDATE subscriptions SET category_id = (SELECT id FROM categories c WHERE c.user_id = subscriptions.user_id AND c.name = subscriptions.category) WHERE ...`; (5) `create_foreign_key(..., ondelete='RESTRICT')` inside `batch_alter_table` (SQLite-safe); (6) `alter_column(..., nullable=False)` only AFTER backfill — this fails loudly on dirty rows (e.g. empty `payment_method`), which is the intended dev-stage signal; (7) `drop_column` old string col. `down_revision` = verify actual `alembic heads` (don't trust a written-down value — earlier merges may not be the tip). Docstring the empty-row assumption.
- **Missing `server_default` on Boolean columns** — SQLite can't handle Python-side defaults in ALTER TABLE; always use `server_default=text("1")` / `text("0")` for non-nullable Boolean columns
- **Missing `server_default` on non-nullable String columns** — SQLite ALTER TABLE requires `server_default` for adding NOT NULL columns to existing tables; always provide `server_default=text("...")` (e.g., `server_default=text("CNY")` for currency fields)
- **Notification channel switches defaulting to `text("1")`** — enabling a channel that sends external messages should default OFF so existing users don't get surprise messages; prefer `server_default=text("0")` and require explicit opt-in.
- **User-local reminder schedule fields** — `User.reminder_time` (`String(5)`, default/server_default `"09:00"`), `User.timezone` (`String(64)`, default/server_default `"Asia/Shanghai"`), and internal `User.last_reminder_local_date` (`Date`, nullable, no API exposure). When adding similar “preferred local wall-clock” features: store IANA timezone + `HH:MM` string, validate with `zoneinfo.ZoneInfo` + regex at write time, and use a separate day-marker column for job idempotency instead of relying on a once-daily scheduler interval.

---

## Acknowledgement-Marker Pattern (vs. Advancing Dates)

When implementing a "mark as done / acknowledged / read" action on a dated entity that already has a separate scheduled job that **advances** that date (e.g., `process_renewals` advances `Subscription.next_billing_date`), do NOT implement "ack" by advancing the same date — write a **separate marker field** instead.

**Problem (double-advance conflict)**: If `acknowledge` sets `next_billing_date = next_billing_date + cycle`, and `process_renewals` later runs on the same due day and advances it again, the same billing period gets advanced twice — data corruption. The business date loses its real meaning.

**Solution**: add a separate marker column storing the date being acknowledged:

```python
acknowledged_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)

# ack endpoint — ONLY writes the marker, NEVER touches next_billing_date
subscription.acknowledged_billing_date = subscription.next_billing_date
```

Suppression logic is "marker == current business date":

```python
# scanner skips subs already acknowledged for the current period
or_(
    Subscription.acknowledged_billing_date.is_(None),
    Subscription.acknowledged_billing_date != Subscription.next_billing_date,
)
```

**Why this self-resets**: when `next_billing_date` later advances (by the scheduled job or a manual edit), `acknowledged_billing_date != next_billing_date` becomes true again → reminders resume next period automatically. No cleanup job needed.

**When to apply**: any feature that lets a user "dismiss" a dated event where another mechanism mutates that date. If no other writer touched the field, advancing it on ack would be fine — the conflict only arises because two writers target the same field.

> **Warning (cross-query invariant)**: EVERY query that surfaces "due-soon / upcoming / to-remind" subscriptions MUST apply the same `or_(acknowledged_billing_date.is_(None), acknowledged_billing_date != next_billing_date)` filter as the scanner — not just the notification scanner. A read path that skips this filter (e.g. `GET /stats` `due_soon`) will silently re-surface subscriptions the user already acknowledged after a page refresh, splitting the UI's "confirmed" state from the backend's. Bug `07-05-fix-dashboard-acknowledge` was exactly this: the scanner excluded acknowledged subs but `/stats` forgot to, so Dashboard's "确认已续费" button reappeared on refresh. When adding any new due-soon-style query, copy the filter from `backend/app/services/notifications/scanner.py:43-44` verbatim.

---

## next_billing_date Must Be Future-Aligned on Write (Create/Update)

`_compute_next_billing_date(start_date, cycle_count, cycle_unit)` only returns `start_date + one cycle` — it does NOT compare against today. When a user adds a historical subscription (start_date far in the past, already renewed many times), the raw result sits stale in the past. The scheduled `process_renewals` job only advances `auto_renew=True` rows, so `auto_renew=False` historical subscriptions would keep a past `next_billing_date` forever.

**Rule**: on create and on update (when `start_date` / `cycle_count` / `cycle_unit` changes), after computing the initial `next_billing_date`, run it through `_align_to_future` (defined in `routers/subscriptions.py`). This loops `advance_next_billing_date` (from `services/renewal.py` — single-sourced cycle math) until `next_billing_date > today`, guarded by `_MAX_CATCH_UP` (mirror `forecast.py`'s budget). If the budget is exhausted, leave the date as-is (never crash).

```python
from app.services.renewal import advance_next_billing_date

_MAX_CATCH_UP = 2000  # mirror forecast.py

def _align_to_future(next_date, cycle_count, cycle_unit, today=None):
    if today is None:
        today = date.today()
    guard = 0
    while next_date <= today and guard < _MAX_CATCH_UP:
        next_date = advance_next_billing_date(next_date, cycle_count, cycle_unit)
        guard += 1
    return next_date

# create
next_date = _compute_next_billing_date(start_date, cycle_count, cycle_unit)
dump["next_billing_date"] = _align_to_future(next_date, cycle_count, cycle_unit)

# update (only when cycle/start changed)
if cycle_changed or start_changed:
    next_date = _compute_next_billing_date(...)
    subscription.next_billing_date = _align_to_future(next_date, ...)
```

**Do NOT** add a second cycle-step implementation — always reuse `advance_next_billing_date`. `process_renewals` and `forecast.py`'s defensive catch-up stay as runtime safety nets and are NOT changed by this rule.

---

## Per-User External Credentials: Enable Requires Validation

When storing per-user third-party credentials (SMTP, Telegram bot token, etc.) as nullable columns on `User` alongside an `<channel>_enabled` boolean, enabling the channel is a two-field contract: the switch AND its credentials. Enabling without complete credentials is a 422, not a silent runtime skip:

```python
def _validate_channel_credentials(user: User) -> None:
    if user.reminder_email_enabled:
        if not (user.smtp_host and user.smtp_port and user.smtp_user and user.smtp_password):
            raise HTTPException(status_code=422, detail="Email channel enabled but SMTP credentials incomplete")
    # ...same for telegram
```

**Why two layers**:
- **At write time (PUT, 422)** — fail loud so the user knows their config is broken before relying on it.
- **At runtime (scanner, silent skip)** — the scheduled job builds channels from the saved user; `build_channels` catches `ValueError` from incomplete creds and `logger.warning`s + skips, because raising **inside a background job would crash the scheduler**. Background jobs must never raise on bad stored state.

So: validate at the API boundary, defend-in-depth at the job boundary. Credentials stored plaintext on SQLite is accepted for the local/single-machine MVP; revisit encryption only when moving off local SQLite.

---

## Required-but-nullable-by-default Schema Pattern

When adding a new **required** field to an existing table that already has data, you cannot enforce NOT NULL with a real value (existing rows have no value). Use a two-layer approach:

- **DB layer**: column is `nullable=False` with a sentinel `server_default=""` (or another empty sentinel). This lets the migration add the column to existing rows without a backfill error.
- **Schema/API layer**: Pydantic field is **required with `min_length=1`**, so new creates/edits reject empty strings (`422`). Existing rows keep the empty sentinel until edited.

```python
# Model: non-nullable with empty-string default (migration-safe on existing data)
payment_method: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")

# Create schema: required + non-empty (the actual enforcement lives here)
payment_method: str = Field(min_length=1)

# Update schema: optional when omitted, but non-empty when provided
payment_method: str | None = Field(default=None, min_length=1)

# Response schema: always present (may be "" for legacy rows)
payment_method: str
```

Frontend mirrors the same distinction: a required combobox `trim()`s and validates non-empty **before** submit (see Frontend Component Guidelines: Required vs optional combobox variant). Pure-whitespace input (`"  "`) passes `min_length=1` at the API layer but is rejected by the frontend `trim()` check.

**Contrast with optional free-text fields** (e.g. `category`): the column is `nullable=True` with no sentinel, the schema field is `str | None = None`, and the list endpoint filters `isnot(None)`. For the empty-sentinel pattern, filter non-null **and** `!= ""` instead.

```python
# nullable field (category)
.filter(Subscription.category.isnot(None))

# empty-sentinel required field (payment_method)
.filter(Subscription.payment_method != "")
```
