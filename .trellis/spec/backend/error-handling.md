# Error Handling

> How errors are handled in this project.

---

## Overview

- HTTP exceptions via `fastapi.HTTPException`
- JWT auth errors: 401 with `detail="Could not validate credentials"`
- Ownership violations: 403 with `detail="Not authorized"`
- Not found: 404 with `detail="<Resource> not found"`
- Validation errors: FastAPI auto-returns 422 with field-level details

---

## Error Types

- `401 Unauthorized` — missing/invalid/expired JWT, wrong password
- `403 Forbidden` — accessing another user's resource
- `404 Not Found` — resource doesn't exist or belongs to another user
- `400 Bad Request` — duplicate email, invalid input, unsupported locale/currency
- `422 Validation Error` — Pydantic schema validation (auto)

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

- Use `HTTPException` directly in routers — no custom exception classes needed for MVP
- For ownership checks: query with `user_id` filter, return 404 if not found (prevents IDOR)

```python
subscription = db.query(Subscription).filter(
    Subscription.id == sub_id,
    Subscription.user_id == current_user.id
).first()
if not subscription:
    raise HTTPException(status_code=404, detail="Subscription not found")
```

---

## API Error Responses

```json
{"detail": "Error message string"}
```

For 422 validation errors, FastAPI returns the standard schema with field-level details.

---

## Common Mistakes

- **Returning 404 vs 403** — when a user accesses another user's resource, return 404 (not 403) to avoid leaking existence
- **Forgetting to verify token type** — access tokens and refresh tokens must be validated by `type` claim to prevent a refresh token from accessing protected endpoints
- **Missing ownership check** — always include `user_id` filter in queries

---

## i18n Error Messages

Backend error messages remain in English. Frontend maps them to localized strings via an `ERROR_KEY_MAP`:

```typescript
const ERROR_KEY_MAP: Record<string, string> = {
  "Email already registered": "errors.emailRegistered",
  "Invalid credentials": "errors.invalidCredentials",
  "Invalid refresh token": "errors.invalidRefreshToken",
  "User not found": "errors.userNotFound",
  "Subscription not found": "errors.subscriptionNotFound",
};
```

When adding new backend error messages, add the `detail` string to this map and both translation files.
