# Quality Guidelines

> Code quality standards for backend development.

---

## Forbidden Patterns

- `datetime.utcnow()` — use `datetime.now(timezone.utc)` instead
- `@app.on_event("startup")` — use the `lifespan` context manager pattern
- `!= None` in SQLAlchemy filters — use `.isnot(None)` instead
- Hardcoded secrets in production paths — all secrets via `Settings` (env vars)
- `FormEvent` import from React (deprecated in strict mode) — use `import { useState } from "react"; import type { FormEvent as ReactFormEvent } from "react"` or `type FormEvent<HTMLFormElement>` alternative

---

## Required Patterns

- Pydantic settings via `BaseSettings` for all config (`config.py`)
- JWT access + refresh tokens with `type` claim validation ("access" / "refresh")
- Password hashing with passlib bcrypt
- `useCallback` for functions passed as context values (prevents unnecessary re-renders)
- Single `export default` per component file (react-refresh compatibility)
- `key` prop on form components to force remount when switching between entities

---

## Testing Requirements

- Backend: manual API verification via curl during check phase
- Frontend: `tsc --noEmit` + `eslint` + `npm run build` must pass

---

## Code Review Checklist

- [ ] No deprecated API usage (`datetime.utcnow`, `on_event`)
- [ ] JWT token type validated in `get_current_user`
- [ ] Ownership checks on all mutation endpoints
- [ ] No hardcoded secrets
- [ ] Cross-layer types match (backend Pydantic ↔ frontend TypeScript)
- [ ] Alembic env imports all models
