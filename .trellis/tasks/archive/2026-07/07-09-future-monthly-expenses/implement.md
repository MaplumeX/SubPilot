# Implement: future monthly expenses

## Checklist

### 1. Backend forecast service

- [ ] Add `backend/app/services/forecast.py`
  - `project_charges` using `advance_next_billing_date`
  - honor `auto_renew`, `today`, `window_end`, iteration cap
  - helpers: last day of month, 12 `YYYY-MM` buckets, `next_30_days_total`
- [ ] Unit-style sanity via quick manual script or interactive check if convenient (optional; no test harness required)

### 2. Schemas + route

- [ ] Add `ForecastChargeItem`, `MonthlyForecast`, `SubscriptionForecast` to `backend/app/schemas/subscription.py`
- [ ] Export if package re-exports schemas
- [ ] Add `GET /forecast` on `backend/app/routers/subscriptions.py` **before** `/{subscription_id}`
- [ ] Load active subs, compute rates, return 12 months + `next_30_days_total` + `base_currency`

### 3. Frontend API/types

- [ ] Types in `frontend/src/api/types.ts`
- [ ] `getForecast()` in `frontend/src/api/subscriptions.ts`

### 4. Statistics UI

- [ ] `StatisticsPage.tsx`: fetch forecast; BarChart; selection + detail panel
- [ ] i18n keys in `zh-CN.json` / `en.json` under `statistics`

### 5. Dashboard UI

- [ ] `DashboardPage.tsx`: fetch forecast; use `next_30_days_total`; remove converted_price 30-day client math
- [ ] Update `dashboard.nextMonthProjection*` copy if wording is now inaccurate

### 6. Validation

- [ ] Backend: hit `GET /api/v1/subscriptions/forecast` authenticated — shape, 12 months, non-negative totals
- [ ] UI: Statistics chart + click detail; Dashboard 30-day number
- [ ] Spot-check yearly / weekly / `auto_renew=false`
- [ ] Confirm Recharts colors use bare CSS vars

## Validation commands

```bash
# backend (from backend/) — start app if not running, then:
# curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/subscriptions/forecast

cd frontend && npm run build
# optional: npm run lint / typecheck if scripts exist
```

## Risky files / rollback points

| Area | Files | Risk |
|------|-------|------|
| Route order | `routers/subscriptions.py` | Static `/forecast` after `/{id}` → 422 |
| Cycle math | `services/forecast.py` vs `renewal.py` | Drift if duplicated — always import advance helper |
| Dashboard | `DashboardPage.tsx` | Number change vs old estimate may surprise; copy must explain cashflow |
| Stats layout | `StatisticsPage.tsx` | Dense page — keep chart full-width, don’t break pie/top grid |

Rollback: revert the new service/route/UI; no migrations.

## Review gates before claiming done

- [ ] PRD AC1–AC8 covered
- [ ] `trellis-check` / quality pass
- [ ] Spec update if new conventions emerge (forecast service location, cashflow vs normalized stats)
