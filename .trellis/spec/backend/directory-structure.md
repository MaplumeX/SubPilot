# Directory Structure

> How backend code is organized in this project.

---

## Overview

The backend follows a layered architecture with FastAPI, organized by domain (models, schemas, routers) rather than by feature.

---

## Directory Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry, CORS, lifespan, router registration, APScheduler + static mount
│   ├── config.py            # pydantic-settings BaseSettings
│   ├── database.py           # SQLAlchemy engine, SessionLocal, Base (DeclarativeBase)
│   ├── deps.py               # Shared dependencies (get_db, get_current_user)
│   ├── models/
│   │   ├── __init__.py       # Re-exports all models + enums via __all__
│   │   ├── user.py           # User SQLAlchemy model
│   │   ├── subscription.py   # Subscription + CycleUnit / SubscriptionStatus enums
│   │   └── exchange_rate.py  # ExchangeRate SQLAlchemy model
│   ├── schemas/
│   │   ├── __init__.py       # Empty (schemas imported directly, not re-exported)
│   │   ├── auth.py           # Auth + User Pydantic schemas
│   │   ├── subscription.py   # Subscription + Stats Pydantic schemas
│   │   └── notification.py   # Notification settings + test-channel schemas
│   ├── services/
│   │   ├── __init__.py       # Re-exports renewal functions only
│   │   ├── renewal.py        # Auto-renewal background service
│   │   ├── exchange_rate.py  # Exchange rate fetch + lookup service
│   │   └── notifications/    # Reminder scanning subpackage (NOT re-exported by services/__init__)
│   │       ├── __init__.py   # Re-exports process_reminders
│   │       ├── scanner.py    # process_reminders: scan due subs + dispatch per channel
│   │       ├── channels.py    # EmailChannel / TelegramChannel + build_channels
│   │       └── templates.py   # Locale (en/zh-CN) reminder subject/body rendering
│   └── routers/
│       ├── __init__.py
│       ├── auth.py           # /api/v1/auth/* (incl. /me/notifications* — no separate notifications router)
│       └── subscriptions.py  # /api/v1/subscriptions/*
├── alembic/
│   ├── env.py               # Imports all models so autogenerate detects them
│   └── versions/             # Auto-generated migrations
├── static/
│   └── logos/                # Uploaded subscription logos (served via StaticFiles at /static)
├── alembic.ini
└── requirements.txt
```

---

## Module Organization

- **models/** — SQLAlchemy ORM models, one file per entity. `models/__init__.py` re-exports every model **and** its enums (e.g. `CycleUnit`, `SubscriptionStatus`) via `__all__` so callers do `from app.models import Subscription, CycleUnit`.
- **schemas/** — Pydantic request/response schemas, one file per domain. `schemas/__init__.py` is **empty**; import directly from the schema module (e.g. `from app.schemas.notification import ...`).
- **services/** — Background services and business logic that spans models or runs outside request context. `services/__init__.py` re-exports the `renewal` functions; the `notifications/` subpackage is self-contained and imported by path (`from app.services.notifications import process_reminders`).
- **routers/** — FastAPI routers, one file per API domain. All routes under `/api/v1/<domain>`. Notification settings endpoints live under the `auth` router (`/me/notifications*`), not a separate router.
- **deps.py** — Shared FastAPI dependencies (DB session, current user extraction).

---

## Naming Conventions

- Model files: `user.py`, `subscription.py` (singular, lowercase)
- Schema files: `auth.py`, `subscription.py` (match the router domain)
- Router files: `auth.py`, `subscriptions.py` (match the URL prefix)
- Alembic migrations: auto-generated with descriptive messages

---

## Adding a New Domain

1. Create model in `models/<name>.py`, import in `models/__init__.py`
2. Create schemas in `schemas/<name>.py`
3. Create router in `routers/<name>.py`
4. Register router in `main.py`
5. Import model in `alembic/env.py` for autogenerate
6. Run `alembic revision --autogenerate -m "add <name> table"`

### Adding a Background Service

1. Create service module in `services/<name>.py` with a main function that accepts a `db: Session` parameter.
2. For a single-module service, import and re-export in `services/__init__.py`. For a multi-module service, create a subpackage directory (`services/<name>/`) with its own `__init__.py` re-exporting the public entry point — see `services/notifications/` as the reference.
3. In `main.py` lifespan, start an APScheduler `BackgroundScheduler` job (registered before `scheduler.start()`) that:
   - Creates its own `SessionLocal()` context (not FastAPI's dependency injection)
   - Calls the service function
   - Closes the session after completion
4. Wrap the job body in `try/except` with `logger.exception(...)` — **never** let a background job raise, or the scheduler crashes for all users. See the `_run_renewals` / `_run_reminders` wrappers in `main.py`.
5. **Startup immediate run for correctness-critical jobs**: APScheduler `interval` triggers (e.g. `days=1`) first fire at roughly `now + interval`, **not** on registration. Dev `--reload` also resets that timer. If the job must keep data correct after restarts/downtime (auto-renewal, exchange rates), call the same `_run_*` wrapper **once in lifespan before `scheduler.start()`**, then keep the interval job for ongoing runs. Current pattern in `main.py`:
   ```python
   scheduler.add_job(_run_renewals, "interval", days=1, id="auto_renewal")
   scheduler.add_job(_run_exchange_rates, "interval", days=1, id="fetch_exchange_rates")
   scheduler.add_job(_run_reminders, "interval", days=1, id="send_reminders")
   _run_renewals()          # immediate — data correctness
   _run_exchange_rates()    # immediate — data correctness
   scheduler.start()
   # reminders intentionally interval-only for now (not required at boot)
   ```
6. **Catch-up for date-advancing jobs**: if a job advances a calendar field (e.g. `process_renewals` advances `Subscription.next_billing_date`), one step per run is not enough after multi-day downtime. Loop per row until the field is strictly in the future (`next_billing_date > today`), still only mutating the business date — never the ack marker. See `services/renewal.py`.
7. Shut down scheduler in the lifespan exit handler (`scheduler.shutdown(wait=False)`).

### Serving Uploaded Files

User-uploaded logos are written to `backend/static/logos/` and served by `app.mount("/static", StaticFiles(directory="static"))` in `main.py`. The Vite dev proxy forwards `/static` to the backend (`frontend/vite.config.ts`). The `lifespan` startup creates the `static/logos` directory if missing.
