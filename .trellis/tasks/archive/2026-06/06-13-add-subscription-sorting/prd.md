# Add Subscription Sorting

## Goal

Add column-based sorting to the subscriptions list page so users can organize subscriptions by relevant fields.

## Requirements

* Sortable columns: **Name**, **Price** (converted_price), **Next Billing Date**
* Server-side sorting via query params (`sort_by` + `sort_order`) on `GET /api/v1/subscriptions`
* Default sort: **created_at descending** (preserves current behavior)
* Sort direction indicator (arrow) on sortable column headers
* Single-column sort only (click new column replaces current sort)
* Clicking the same column toggles asc/desc
* Sorting works correctly with existing category/status filters

## Acceptance Criteria

* [ ] Backend accepts `sort_by` and `sort_order` query params on list endpoint
* [ ] `sort_by` validated against allowed fields (name, converted_price, next_billing_date)
* [ ] `sort_order` validated as "asc" or "desc", defaults to "asc"
* [ ] Default sort (no params): created_at descending
* [ ] Clickable column headers on Name, Price, Next Billing Date trigger sorting
* [ ] Sort direction arrow shown on active sort column
* [ ] Clicking active sort column toggles direction
* [ ] Clicking a different column sets it as new sort (asc default)
* [ ] Sort state persists within page session
* [ ] Sorting + filtering work together correctly

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green

## Out of Scope

* Multi-column sorting
* Sort persistence across page reloads (localStorage/URL)
* Sorting on Cycle, Category, Status, Auto-renew columns (low value)

## Technical Approach

* Backend: Add `sort_by` and `sort_order` query params to `list_subscriptions` endpoint
* For `sort_by=converted_price`: compute `price * exchange_rate` in SQL via JOIN with `exchange_rates` table, then `order_by` the computed expression
* For `sort_by=name` / `sort_by=next_billing_date`: direct `order_by` on DB columns
* Default: `order_by(Subscription.created_at.desc())` when no sort params
* Frontend: Replace static `<TableHead>` with clickable headers, add `sort_by`/`sort_order` state, pass to API call
* Use shadcn/ui pattern for sort indicator (arrow icon)

## Technical Notes

* Frontend: `frontend/src/pages/SubscriptionsPage.tsx`
* Backend: `backend/app/routers/subscriptions.py` — list endpoint
* Schema: `backend/app/schemas/subscription.py`
* Model: `backend/app/models/subscription.py`
* converted_price = `normalize_to_monthly(price, cycle_count, cycle_unit) * get_rate(db, sub.currency, user.base_currency)` — computed in-memory, not a DB column
* ExchangeRate model exists with `exchange_rates` table, `get_rate()` looks up most recent rate by date desc
* For converted_price sort: need SQL JOIN on exchange_rates + compute `price * rate` in query, or compute `normalize_to_monthly * rate` as a hybrid expression
