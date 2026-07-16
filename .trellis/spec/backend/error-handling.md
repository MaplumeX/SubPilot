# Error Handling

> How errors are handled in this project.

---

## Overview

- HTTP exceptions via `fastapi.HTTPException` raised directly in routers.
- JWT auth errors: 401 with `detail="Could not validate credentials"` (see `deps.get_current_user` / `auth.refresh`).
- **Ownership violations return 404** with `detail="Subscription not found"` (NOT 403) — see `_check_ownership` in `routers/subscriptions.py`. This avoids leaking whether a resource exists.
- Not found: 404 with `detail="<Resource> not found"`.
- Validation errors: FastAPI auto-returns 422 with field-level details.

---

## Error Types

- `401 Unauthorized` — missing/invalid/expired JWT, wrong password, invalid refresh token, user not found on refresh
- `404 Not Found` — resource doesn't exist OR belongs to another user (ownership check collapses both into 404)
- `400 Bad Request` — duplicate email (`register`), invalid `sort_by`/`sort_order`, invalid upload file type / size, unsupported locale/currency, notification test send failure
- `422 Validation Error` — Pydantic schema validation (auto); also raised manually for "channel enabled but credentials incomplete" in `auth._validate_channel_credentials`

---

## Input Validation for Query Params

For enum/whitelist query params (e.g., `sort_by`, `sort_order`), validate manually and return 400 — don't rely solely on FastAPI's 422:

```python
SORTABLE_FIELDS = {"name", "converted_price", "next_billing_date"}

if sort_by is not None and sort_by not in SORTABLE_FIELDS:
    raise HTTPException(status_code=400, detail=f"Invalid sort_by field: {sort_by}")
```

Why: whitelist validation prevents SQL injection through column names (string-to-order_by mapping), and 400 is more appropriate than 422 for domain constraint violations.

---

## Error Handling Patterns

- Use `HTTPException` directly in routers — no custom exception classes.
- Two-step ownership pattern: fetch by id, then call `_check_ownership(sub, current_user.id)` which raises 404 for both missing and wrong-owner (`routers/subscriptions.py`). Centralizing this keeps the IDOR-protective 404 consistent across endpoints.

```python
subscription = db.query(Subscription).filter(Subscription.id == sub_id).first()
_check_ownership(subscription, current_user.id)  # 404 if None or wrong owner
```

---

## API Error Responses

```json
{"detail": "Error message string"}
```

For 422 validation errors, FastAPI returns the standard schema with field-level details.

### Reference-count delete: 409 with top-level `count`

When a DELETE endpoint must refuse an entity that is still referenced (e.g. a `Category` / `PaymentMethod` used by `subscriptions`), return **409** with the reference count as a **top-level** field, not nested under `detail`:

```python
from fastapi.responses import JSONResponse

count = db.query(func.count(Subscription.id)).filter(
    Subscription.category_id == entity_id, Subscription.user_id == current_user.id
).scalar() or 0
if count > 0:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Category is in use", "count": count},
    )
```

**Contract**: body shape is `{"detail": str, "count": int}` at the top level. Frontend reads `err.response.data.count` (NOT `err.response.data.detail.count`) to render "被 N 条订阅使用,无法删除". Keep the field name `count` and keep it top-level.

**Why a pre-check instead of relying on the FK `ondelete=RESTRICT` constraint**: the DB constraint guarantees integrity as a backstop, but its IntegrityError surfaces as a generic 500 with no actionable count. The explicit pre-check returns a localized, actionable 409. Belt-and-suspenders: RESTRICT at the DB layer + count-check at the API layer.

**Also**: name-collision on create/rename (per-user `UNIQUE(user_id, name)`) returns 409 with the standard `{"detail": "..."}` shape (no count) — catch `IntegrityError` and raise `HTTPException(409, ...)`.

---

## Common Mistakes

- **Returning 404 vs 403** — when a user accesses another user's resource, return 404 (not 403) to avoid leaking existence
- **Forgetting to verify token type** — access tokens and refresh tokens must be validated by `type` claim to prevent a refresh token from accessing protected endpoints
- **Missing ownership check** — always include `user_id` filter in queries

---

## i18n Error Messages

Backend error messages remain in English. Frontend maps them to localized strings via an `ERROR_KEY_MAP` (defined per component that surfaces errors; `SubscriptionForm.tsx` is the reference). The map keys are exact backend `detail` strings:

```typescript
const ERROR_KEY_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Email already registered": "errors.emailRegistered",
  "Subscription not found": "errors.subscriptionNotFound",
  "Invalid file type. Allowed: JPG, PNG, GIF, WebP": "subscriptionForm.invalidFileType",
  "File size exceeds 2MB limit": "subscriptionForm.fileTooLarge",
};
```

Fallback is a generic message when the `detail` is not in the map:

```typescript
const key = ERROR_KEY_MAP[detail];
setError(key ? t(key) : t("subscriptionForm.saveFailed"));
```

Note some flows surface the **raw** `detail` instead of mapping it (e.g. `SettingsPage` notification save/test shows the untranslated backend string as `error`). That is an accepted current-state shortcut, not a pattern to copy for new user-facing errors — prefer mapping.

When adding a new backend error message that should be shown to end users:
1. Add the exact `detail` string → `errors.<key>` (or `subscriptionForm.<key>`) entry to every `ERROR_KEY_MAP` that surfaces it.
2. Add `<key>` to both `frontend/src/i18n/en.json` and `zh-CN.json`.
3. Keep `status` codes consistent with the [Error Types](#error-types) table above.
