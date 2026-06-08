# Logging Guidelines

> How logging is done in this project.

---

## Overview

This project uses Python's standard `logging` module. There is no application-level logger configured yet — only Alembic configures logging via `fileConfig` in `alembic/env.py`. When adding logging, use the stdlib `logging` module directly; do not introduce additional logging libraries unless a structured logging need arises.

---

## Log Levels

| Level | When to use |
|-------|-------------|
| `DEBUG` | Detailed diagnostic info (query parameters, function args). Dev-only. |
| `INFO` | Normal operational events (server start, user signup, subscription created). |
| `WARNING` | Recoverable issues (deprecated API usage, rate limit接近). |
| `ERROR` | Failed operations (unhandled exceptions, database connection lost). |

---

## Structured Logging

No structured logging format is enforced yet. When adding logs:

- Use `logging.getLogger(__name__)` per module to create loggers.
- Prefer f-strings or `%s` style over string concatenation.
- Include request context (user_id, path) where available.

Example in a router:

```python
import logging

logger = logging.getLogger(__name__)

@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(data: SubscriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logger.info("subscription created: user=%s name=%s", current_user.id, data.name)
    ...
```

---

## What to Log

- Authentication events: login success/failure, token refresh, logout
- CRUD operations: creation and deletion of resources (with user_id)
- Error conditions: caught exceptions that return a non-2xx response
- Startup/shutdown: app lifecycle events (already partially covered by uvicorn)

---

## What NOT to Log

- **Passwords** — never log plain or hashed passwords
- **JWT tokens** — do not log access_token or refresh_token values
- **Full request bodies** on retry/failure — may contain PII
- **Database connection strings** — the DATABASE_URL may contain credentials
