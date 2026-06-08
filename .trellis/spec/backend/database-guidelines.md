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

## Common Mistakes

- **Forgetting to import models in `alembic/env.py`** → autogenerate won't detect changes
- **Using `datetime.utcnow()`** → deprecated; use `datetime.now(timezone.utc)` via a `_utcnow` helper
- **Using `!= None`** → SQLAlchemy doesn't translate this correctly; use `.isnot(None)`
- **Missing `ondelete="CASCADE"`** on ForeignKey → orphaned records in SQLite when parent is deleted
