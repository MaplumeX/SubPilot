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
- **SSRF protection for outbound server-side fetches**: any new backend endpoint that fetches a user-influenced URL (image proxy, webhook, URL preview, etc.) MUST route the request through `app/services/ssrf.py::safe_get`. The helper enforces (a) an optional host allowlist for fixed-target endpoints (e.g. search providers), (b) DNS resolution followed by IP rejection of private/reserved/loopback/link-local/multicast/unspecified ranges, (c) explicit CGNAT `100.64.0.0/10` rejection — Python's `ipaddress.is_private` does **NOT** cover this range, so it must be checked separately. Endpoints that accept arbitrary CDN hosts (e.g. `cache-logo`) pass `allowlist=None` and rely on the IP filter alone; endpoints with a fixed provider set pass a tight allowlist. Internal `SsrfBlockedError` is caught in the router and translated to `HTTPException(400)` — never let it surface as 500.

  **Known limitation (httpx 0.28)**: `httpx.HTTPTransport` has no `resolver=` kwarg, so true DNS pinning (validate-then-connect-to-the-validated-IP) is not available in the sync transport. Current `safe_get` validates the resolved IP then lets httpx re-resolve — a small TOCTOU window remains, and `follow_redirects=True` Location hops are not re-validated. This is an accepted tradeoff documented in `services/ssrf.py`; if a future httpx release restores resolver pinning or the project adopts `httpx<0.24` / an async transport with resolver support, upgrade `safe_get` to pin.
- **FastAPI route declaration order**: declare every static sub-path route before any dynamic `/{id}` route in the same router. FastAPI matches routes in declaration order; a static path like `/payment-methods` declared after `/{subscription_id}` gets captured as `subscription_id="payment-methods"` and fails `int` parsing → 422. Order all static sub-paths (`/categories`, `/stats`, `/forecast`, `/upload-logo`, `/payment-methods`, `/{id}/acknowledge`) ahead of `GET/PUT/DELETE /{subscription_id}` in `routers/subscriptions.py`.

  ```python
  # Wrong — /payment-methods is shadowed by /{subscription_id}
  @router.get("/{subscription_id}")
  def get_subscription(...): ...
  @router.get("/payment-methods")        # never reached: "payment-methods" → int → 422
  def list_payment_methods(...): ...

  # Correct — static sub-paths first
  @router.get("/payment-methods")
  def list_payment_methods(...): ...
  @router.get("/{subscription_id}")
  def get_subscription(...): ...
  ```

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
- [ ] Static sub-path routes declared before dynamic `/{id}` routes in every router
- [ ] Scheduled jobs swallow exceptions (`logger.exception`, no re-raise)
- [ ] New `detail` strings added to frontend `ERROR_KEY_MAP` + both i18n files when user-facing
- [ ] Outbound fetches of user-influenced URLs go through `services/ssrf.py::safe_get` (host allowlist or IP filter + CGNAT check)
- [ ] Logs of upstream failures do not embed user-supplied query/URL content at INFO/WARNING (PII-ish) — log exception type/name, not the URL
