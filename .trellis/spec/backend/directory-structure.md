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
│   ├── main.py              # FastAPI app entry, CORS, lifespan, router registration
│   ├── config.py             # pydantic-settings BaseSettings
│   ├── database.py           # SQLAlchemy engine, SessionLocal, Base, get_db
│   ├── deps.py               # Shared dependencies (get_db, get_current_user)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py           # User SQLAlchemy model
│   │   └── subscription.py   # Subscription SQLAlchemy model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py           # Auth Pydantic schemas
│   │   └── subscription.py   # Subscription Pydantic schemas
│   └── routers/
│       ├── __init__.py
│       ├── auth.py           # /api/v1/auth/* endpoints
│       └── subscriptions.py  # /api/v1/subscriptions/* endpoints
├── alembic/
│   ├── env.py
│   └── versions/             # Auto-generated migrations
├── alembic.ini
└── requirements.txt
```

---

## Module Organization

- **models/** — SQLAlchemy ORM models, one file per entity
- **schemas/** — Pydantic request/response schemas, one file per domain
- **routers/** — FastAPI routers, one file per API domain. All routes under `/api/v1/<domain>`
- **deps.py** — Shared FastAPI dependencies (DB session, current user extraction)

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
