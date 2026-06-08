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
- `400 Bad Request` — duplicate email, invalid input
- `422 Validation Error` — Pydantic schema validation (auto)

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
