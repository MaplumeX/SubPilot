# Design: future monthly expenses (cashflow forecast)

## Summary

Add a shared billing-cashflow projection service, expose it via `GET /api/v1/subscriptions/forecast`, render a 12-month bar chart + month detail on Statistics, and switch Dashboard’s 30-day projection to the same server-side cashflow total.

## Architecture

```
active subscriptions
        │
        ▼
services/forecast.py
  project_charges(...)  → list[ChargeEvent]
  group_by_month(...)   → 12 MonthlyBucket
  sum_window(...)       → next_30_days_total
        │
        ▼
GET /subscriptions/forecast
        │
   ┌────┴────┐
   ▼         ▼
Statistics  Dashboard
 (months)   (next_30_days_total)
```

### Why a new endpoint (not stuffing `/stats`)

- `/stats` remains the normalized monthly view (avg/top/category/due_soon).
- Forecast is a different semantic (cashflow events) and is heavier (per-sub cycle rolling).
- Dashboard can fetch forecast once for `next_30_days_total` without pulling unused category breakdowns, or fetch both in parallel as today.

## Backend

### Service: `backend/app/services/forecast.py`

Reuse `advance_next_billing_date` from `renewal.py` — do **not** duplicate cycle math.

```text
ChargeEvent:
  subscription_id: int
  name: str
  billing_date: date
  amount: float          # price * rate, rounded 2dp

project_charges(subs, rates|get_rate, today, window_end) -> list[ChargeEvent]
```

Rules (match PRD R2):

1. Skip if not `active` or `next_billing_date is None`.
2. Start at `next_billing_date`.
3. While `billing_date <= window_end`:
   - If `billing_date >= today`: emit charge with `amount = round(price * rate, 2)`.
   - If `auto_renew` is false: stop after considering that first `next_billing_date` (emit at most once when in range).
   - If `auto_renew` is true: `billing_date = advance_next_billing_date(...)`.
4. Safety: cap iterations per subscription (e.g. 400) to avoid runaway day-cycles; break if exceeded.

Window for monthly buckets:

- `today = date.today()`
- Month 0 = `(today.year, today.month)`
- Month 11 = +11 months
- `window_end` = last calendar day of month 11
- Always return **exactly 12** months, including zeros.

`next_30_days_total`:

- Sum of charge amounts where `today <= billing_date <= today + timedelta(days=30)`.
- Same charge list / rules as monthly projection (one projection pass, two aggregations).

### Schemas (`schemas/subscription.py`)

```python
class ForecastChargeItem(BaseModel):
    subscription_id: int
    name: str
    billing_date: date
    amount: float

class MonthlyForecast(BaseModel):
    year_month: str          # "YYYY-MM"
    total: float
    items: list[ForecastChargeItem]

class SubscriptionForecast(BaseModel):
    base_currency: str
    months: list[MonthlyForecast]   # len == 12
    next_30_days_total: float
```

### Router

- `GET /subscriptions/forecast` → `SubscriptionForecast`
- Declare **before** `/{subscription_id}` (route-order invariant in quality guidelines).
- Auth: `get_current_user`; load active subs for user (joinedload not required for forecast fields).
- Query: `status == active` only; filter `next_billing_date.isnot(None)` in service or query.
- FX: `get_rate(db, sub.currency, current_user.base_currency)` per sub (cache rates in a local dict during the request).

### Rounding

- Per charge: 2 decimal places.
- Month total / next_30_days_total: sum of rounded charges, then round(total, 2) for response stability.

## Frontend

### Types + API

- Extend `frontend/src/api/types.ts` with forecast types.
- `getForecast()` in `frontend/src/api/subscriptions.ts` → `GET /subscriptions/forecast`.

### StatisticsPage

- Fetch `getForecast()` in parallel with existing `getStats` / `listSubscriptions` (or replace list if only needed for Top5 — keep list for Top5).
- New full-width Card above or below the existing 2-col grid:
  - Title: i18n `statistics.monthlyForecast`
  - Recharts `BarChart` / `Bar` / `XAxis` / `YAxis` / `Tooltip` / `ResponsiveContainer`
  - X axis: localized month labels from `year_month`
  - Click bar → `selectedYearMonth` state → detail list under chart
  - Detail rows: name, formatted date, amount; empty month message if total 0
- Theme: bare `var(--chart-*)` / `var(--primary)` for SVG fills (no `hsl()` wrap) per component guidelines.
- Currency format: same `Intl.NumberFormat` helper as today.

### DashboardPage

- Remove client-side `NextMonthProjection` filtering on `converted_price`.
- Fetch `getForecast()` (parallel with stats/list) and display `next_30_days_total`.
- Keep card structure / HeroNumber animation; update subtitle copy to cashflow wording.

### i18n

`statistics.*` and `dashboard.*` keys for:

- forecast title / subtitle
- empty / zero month detail
- selected month detail heading
- dashboard projection subtitle reflecting actual charges in next 30 days

## Compatibility

- No DB migration.
- No change to `/stats` response shape or `total_monthly` meaning.
- `converted_price` remains monthly-normalized for list/sort/Top5.

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Server-side projection | Single source of truth; Dashboard + Stats aligned | Extra API call |
| Separate `/forecast` | Clean semantics vs `/stats` | One more round trip |
| Cap loop iterations | Safety for day cycles | Extremely long windows theoretically truncated (12 months is fine) |
| Partial current month | Honest “remaining” spend | July total mid-month ≠ full July if charges already passed |

## Rollback

- Feature is additive: remove route + UI sections; no schema migration to reverse.
- Dashboard can temporarily fall back to old client estimate only if needed (not planned).

## Test focus (manual / ad-hoc)

No formal backend test suite in repo today — validate via API + UI:

1. Monthly sub → ~1 charge/month in window
2. Yearly sub → one peak month
3. Weekly sub → multiple items in some months; 30-day total > one charge
4. `auto_renew=false` → single item max
5. FX: non-base currency amount converted
6. Route still works; static path not captured by `/{id}`
