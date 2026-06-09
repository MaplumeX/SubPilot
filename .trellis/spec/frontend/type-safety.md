# Type Safety

> Type safety patterns in this project.

---

## Overview

- TypeScript strict mode
- Path alias: `@/*` → `./src/*`
- API boundary types in `src/api/types.ts`
- Pydantic schemas on backend must match TypeScript types on frontend

---

## Type Organization

- `src/api/types.ts` — all API request/response types and enums/shared types
- Inline interfaces — component props defined in the same file
- No separate `types/` directory — keep types close to usage

---

## Validation

- Backend: Pydantic schemas with validators (e.g., `min_length=8` for password)
- Frontend: manual validation in form handlers (e.g., password match, price > 0)
- No Zod/Yup — validate at the API boundary (backend) and in form handlers (frontend)

---

## Common Patterns

- Enum types shared as string union types: `CycleUnit = "day" | "week" | "month" | "year"`
- API response types: `UserResponse` (includes `base_currency`), `SubscriptionResponse` (includes `converted_price`), `TokenResponse`
- Stats type: `SubscriptionStats` (includes `base_currency`)
- Error type narrowing: `(err as { response?: { data?: { detail?: string } } })?.response?.data?.detail`

---

## Forbidden Patterns

- `any` — use `unknown` and narrow
- Type assertions without runtime checks on untrusted data
- Importing backend Python types — maintain separate TypeScript definitions
