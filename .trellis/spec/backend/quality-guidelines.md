# Quality Guidelines

> Code quality standards for backend development.

---

## Forbidden Patterns

- `datetime.utcnow()` — use `datetime.now(timezone.utc)`. Each models module has a private `_utcnow()` helper (`subscription.py`, `user.py`, `exchange_rate.py`); reuse it / follow it rather than calling the raw constructor.
- `@app.on_event("startup")` — use the `lifespan` context manager (see `main.py`).
- `!= None` in SQLAlchemy filters — use `.isnot(None)`.
- Hardcoded secrets in production paths — all secrets via `Settings` (env vars / `.env`).
- Re-raising inside a scheduled APScheduler job — wrap the body in `try/except` and `logger.exception(...)`. See `_run_*` wrappers in `main.py`.
- Custom exception classes — raise `HTTPException` directly in routers for MVP.
- (Frontend, tracked here too) `FormEvent` direct import from React in strict mode — see frontend quality guidelines.

---

## Required Patterns

- Pydantic settings via `BaseSettings` for all config (`config.py`); comma-separated `CORS_ORIGINS` exposed via the `cors_origin_list` property.
- SQLAlchemy `DeclarativeBase` in `database.py`; sync `SessionLocal` via `sessionmaker`.
- JWT access + refresh tokens with `type` claim validation ("access" / "refresh") in both `_create_*_token` (`auth.py`) and `get_current_user` (`deps.py`).
- Password hashing with passlib bcrypt (`pwd_context` in `auth.py`).
- Ownership checks on every mutation/subscription endpoint via `_check_ownership` (`routers/subscriptions.py`).
- Import every model in `alembic/env.py` so autogenerate detects changes.

---

## Testing Requirements

- Backend: manual API verification via curl during check phase (no automated test suite yet).
- Frontend: `tsc --noEmit` + `eslint` + `npm run build` must pass (run from `frontend/`).

---

## Code Review Checklist

- [ ] No deprecated API usage (`datetime.utcnow`, `on_event`)
- [ ] JWT token `type` claim validated in `get_current_user` and `refresh`
- [ ] Ownership checks on all subscription mutation endpoints
- [ ] No hardcoded secrets
- [ ] Cross-layer types match (backend Pydantic ↔ frontend TypeScript in `api/types.ts`)
- [ ] Alembic env imports all models
- [ ] Scheduled jobs swallow exceptions (`logger.exception`, no re-raise)
- [ ] New `detail` strings added to frontend `ERROR_KEY_MAP` + both i18n files when user-facing
