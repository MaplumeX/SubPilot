# Implement: Full currency support from exchange-rate source

## Checklist

### 1. Backend currency set

- [x] Expand `backend/app/currencies.py` to the 30 Frankfurter codes; add sync comment pointing at frontend mirror and Frankfurter `/v1/currencies`.
- [x] Confirm `schemas/subscription.py` validators still import `SUPPORTED_CURRENCIES` (no code change expected beyond set growth).
- [x] Confirm `routers/auth.py` base-currency check and `services/exchange_rate.py` `to=` join pick up the expanded set automatically.

### 2. Backend tests

- [x] Keep/assert `currency="ZZZ"` rejected (`test_contracts.py` or equivalent).
- [x] Add acceptance for a newly allowed code (e.g. `HKD`) on create and/or base-currency update if fixtures allow.
- [x] Run backend test suite for touched contracts.

### 3. Frontend shared module

- [x] Add `frontend/src/lib/currencies.ts` with sorted `SUPPORTED_CURRENCIES` mirror + `currencyLabel(code, locale)`.
- [x] Wire `SubscriptionForm.tsx` Select to shared list + `currencyLabel` (use `i18n.language`).
- [x] Wire `SettingsPage.tsx` base-currency Select the same way; drop local `CURRENCIES` array.

### 4. i18n cleanup

- [x] Grep for `subscriptionForm.currencies`; remove unused keys from `en.json` / `zh-CN.json` if nothing else references them.

### 5. Validation

- [x] Backend: targeted pytest for currency contracts.
- [x] Frontend: `tsc` / project lint as used in repo.
- [x] Smoke: create sub with HKD; set base to SGD; confirm selectors show ~30 labels in zh-CN and en.

### 6. Spec touch-up (Phase 3 or end of implement if trivial)

- [x] If quality/component specs still say “only 5 currencies” or hardcode CNY/USD/EUR/GBP/JPY as the product set, update to “Frankfurter-aligned static set in `app.currencies` / `lib/currencies`”.

## Validation commands

```bash
# backend (from backend/)
uv run pytest tests/test_contracts.py -q
# or full: uv run pytest -q

# frontend (from frontend/)
npm run typecheck   # or package.json equivalent
npm run lint        # if present
```

## Risky files / rollback points

| Area | Risk | Rollback |
|------|------|----------|
| `currencies.py` | Too wide / typo code | Revert set |
| exchange fetch `to=` long list | Upstream partial failure | Existing warning + 1:1 |
| DisplayNames unsupported env | Rare old runtime | Fallback to code |
| Dual static lists | Drift | Same-PR discipline |

## Order notes

1. Backend set first so API accepts new codes.
2. Tests next to lock contract.
3. Frontend mirror + UI.
4. i18n cleanup last.

## Not in this plan

- New API, Combobox, migration, changing `get_rate` fallback.
