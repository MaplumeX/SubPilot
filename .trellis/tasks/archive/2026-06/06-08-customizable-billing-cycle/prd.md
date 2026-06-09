# Customizable Billing Cycle

## Goal

Allow users to define custom billing cycles for subscriptions (e.g., every 2 weeks, every 6 months) instead of being limited to four hardcoded presets. Quick presets remain for common cases.

## Requirements

* Replace `BillingCycle` enum with dual fields: `cycle_count: int` + `cycle_unit: CycleUnit(day/week/month/year)`
* Frontend form: retain 4 quick-preset buttons (每周/每月/每季度/每年) + "自定义" entry that expands number input + unit select
* Quick presets map to: weekly→{1,week}, monthly→{1,month}, quarterly→{3,month}, yearly→{1,year}
* Auto-compute `next_billing_date` from `start_date + cycle_count * cycle_unit` on create/update
* Remove `next_billing_date` manual input from form (auto-derived)
* `_normalize_to_monthly` refactored to use `cycle_count * cycle_unit` for conversion
* Remove billing cycle filter from subscriptions list page
* Display custom cycles in table as "每N单位" (e.g., "每2周", "每6个月")
* Migration: convert existing `billing_cycle` enum column to new dual columns with data migration
* `cycle_count` validation: minimum 1
* i18n labels for display formatting

## Acceptance Criteria

* [ ] User can select a quick preset (每周/每月/每季度/每年) and it works as before
* [ ] User can click "自定义" and input arbitrary cycle_count + cycle_unit
* [ ] cycle_count < 1 is rejected with validation error
* [ ] next_billing_date is auto-computed from start_date + cycle on create/update
* [ ] Dashboard stats (total_monthly/total_yearly) correctly normalize custom cycles
* [ ] Subscriptions table displays cycles as "每N单位" (i18n-aware)
* [ ] Billing cycle filter removed from list page
* [ ] Existing subscription data migrated without loss (weekly→{1,week}, etc.)
* [ ] Lint / typecheck / tests green

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Database migration tested with existing data
* Rollback: migration is reversible

## Decision (ADR-lite)

**Context**: BillingCycle was a fixed enum limiting users to 4 preset cycles
**Decision**: Replace with dual-field (cycle_count + cycle_unit), keep UI presets as shortcuts
**Consequences**: More flexible, normalization is formulaic, requires DB migration from enum to int+enum

## Out of Scope

* Renewal reminders / notifications (future feature, but architecture supports it)
* Auto-incrementing next_billing_date when it passes (just compute on save)
* Billing cycle filter on list page (removed entirely)

## Technical Notes

### Storage design
- Drop `billing_cycle` enum column
- Add `cycle_count: int` (NOT NULL, default 1) + `cycle_unit: CycleUnit(day/week/month/year)` enum
- PostgreSQL: drop old enum type `billingcycle`, create new `cycleunit` enum

### Normalization formula (_normalize_to_monthly)
- day: `price * count * 365 / 12`
- week: `price * count * 52 / 12`
- month: `price * count`
- year: `price * count / 12`

### next_billing_date auto-compute
- From start_date, add cycle_count * cycle_unit
- Use `dateutil.relativedelta` for month/year arithmetic (handles edge cases like month-end)

### Key files
* Backend: `backend/app/models/subscription.py` — model + new CycleUnit enum
* Backend: `backend/app/routers/subscriptions.py` — _normalize_to_monthly, auto-compute next_billing_date
* Backend: `backend/app/schemas/subscription.py` — Pydantic schemas
* Backend: new Alembic migration — drop billing_cycle, add cycle_count + cycle_unit
* Frontend: `frontend/src/api/types.ts` — replace BillingCycle with CycleUnit + cycle_count
* Frontend: `frontend/src/components/SubscriptionForm.tsx` — preset buttons + custom entry
* Frontend: `frontend/src/pages/SubscriptionsPage.tsx` — remove cycle filter, update table display
* Frontend: `frontend/src/i18n/en.json`, `zh-CN.json` — cycle display labels
