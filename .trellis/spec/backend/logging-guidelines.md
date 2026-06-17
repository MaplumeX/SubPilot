# Logging Guidelines

> How logging is done in this project.

---

## Overview

This project uses Python's standard `logging` module via `logging.getLogger(__name__)` per module. Active log sites today: `main.py` (scheduler job results + exceptions), `services/exchange_rate.py` (fetch upsert/failure), `services/notifications/scanner.py` + `channels.py` (send failures, incomplete-credential skips). There is no root logger configuration in the app; only Alembic configures logging via `fileConfig` in `alembic/env.py`. Use the stdlib `logging` module directly; do not introduce additional libraries unless a structured-logging need arises.

**Background-job discipline (critical)**: scheduled jobs (`_run_renewals`, `_run_reminders`, `_run_exchange_rates` in `main.py`) wrap their body in `try/except` and call `logger.exception(...)`. A raised exception in a job body crashes the scheduler for all users — log and continue, never re-raise.

---

## Log Levels

| Level | When to use |
|-------|-------------|
| `DEBUG` | Detailed diagnostic info (query parameters, function args). Dev-only. |
| `INFO` | Normal operational events. Used as `logger.info("Auto-renewed %d subscription(s)", count)` etc. in `main.py`, and `"Sent %d reminder message(s)"` in `scanner.py`. |
| `WARNING` | Recoverable issues — exchange-rate fetch failure (`exchange_rate.py`), missing rate pair fallback, user enabled a channel with incomplete creds (`channels.build_channels` skips + warns). |
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
- **Third-party credentials** — SMTP passwords, Telegram bot tokens, API keys stored on users. When a send fails, log the channel name and ids (`channel.name`, `sub.id`, `user.id`) — never the credential. `logger.exception("Failed sending %s reminder for subscription %s to user %s", channel.name, sub.id, user.id)` is the right shape.
