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
- **Missing `server_default` on Boolean columns** — SQLite can't handle Python-side defaults in ALTER TABLE; always use `server_default=text("1")` / `text("0")` for non-nullable Boolean columns
- **Missing `server_default` on non-nullable String columns** — SQLite ALTER TABLE requires `server_default` for adding NOT NULL columns to existing tables; always provide `server_default=text("...")` (e.g., `server_default=text("CNY")` for currency fields)

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

