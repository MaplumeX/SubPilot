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

- Backend: Pydantic schemas with validators (e.g., `min_length=8` for password, `gt=0` / `ge=1` for price/cycle_count, `min_length=1` for required `payment_method`, `ge=1, le=90` for `reminder_days`).
- Frontend: manual validation in form handlers before submit (e.g., `name.trim()`, `price > 0`, `cycle_count >= 1`, `paymentMethod.trim()` — see `SubscriptionForm.handleSubmit`). Pure-whitespace is rejected by frontend `trim()`; backend `min_length=1` is the backstop.
- No Zod/Yup — validate at the API boundary (backend) and in form handlers (frontend).

---

## Common Patterns

- Enum types shared as string union types: `CycleUnit = "day" | "week" | "month" | "year"`, `SubscriptionStatus = "active" | "cancelled" | "trial"`.
- API response types in `src/api/types.ts`: `UserResponse` (includes `base_currency`, `locale`), `Subscription` (the response shape, includes `converted_price`, `acknowledged_billing_date`, `payment_method`, `logo_url`), `TokenResponse`, `SubscriptionStats`, `NotificationSettings`.
- `NotificationSettingsUpdate = Partial<NotificationSettings>` — the PATCH payload mirrors the full settings object.
- Error type narrowing: `(err as { response?: { data?: { detail?: string } } })?.response?.data?.detail`, falling back to a generic message.
- `Intl.Locale.weekInfo` is not in TS lib types — narrow with an intersection cast when you need the first-day-of-week:
  ```ts
  const loc = new Intl.Locale(locale) as Intl.Locale & {
    weekInfo?: { firstDay: number };
  };
  const first = loc.weekInfo?.firstDay; // 1–7 (Mon–Sun); normalize 7 → 0 for Sunday
  ```
  Used by `CalendarPage.getFirstDayOfWeek`. Wrap in try/catch with a Sunday fallback — some environments lack `weekInfo`.

---

## Forbidden Patterns

- `any` — use `unknown` and narrow
- Type assertions without runtime checks on untrusted data
- Importing backend Python types — maintain separate TypeScript definitions
