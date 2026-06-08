# Add Auto-Renewal Feature

## Goal

Add automatic renewal functionality to subscriptions — when a billing cycle elapses, a scheduled task automatically advances `next_billing_date` for subscriptions with `auto_renew=true`, so users' subscription tracking stays up-to-date without manual intervention.

## Requirements

* Add `auto_renew` boolean field to Subscription model, default `True` (opt-out)
* Add `auto_renew` to Pydantic schemas (create, update, response)
* Add `auto_renew` to frontend types and form
* Add scheduled task (APScheduler) to daily check and advance `next_billing_date` for subscriptions where:
  - `auto_renew = True`
  - `status = active`
  - `next_billing_date` is not null and is past today
* Create database migration for `auto_renew` column
* Frontend form includes an auto_renew toggle (Switch component)
- API must support creating and updating the `auto_renew` field

## Acceptance Criteria

* [ ] `auto_renew` boolean column exists on subscriptions table (default True)
* [ ] Alembic migration created and applies cleanly
* [ ] POST /api/v1/subscriptions accepts `auto_renew` field
* [ ] PUT /api/v1/subscriptions/{id} accepts `auto_renew` field
* [ ] GET endpoints return `auto_renew` in response
* [ ] Scheduled task runs daily, advances `next_billing_date` by one billing cycle for qualifying subscriptions
* [ ] Scheduled task only processes `active` subscriptions with `auto_renew=true`
* [ ] Frontend SubscriptionForm includes auto_renew toggle
* [ ] Subscription list/table reflects updated next_billing_date after renewal

## Definition of Done

* Database migration created for schema change
* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Cross-layer consistency: backend ↔ frontend types match

## Technical Approach

### Backend

1. Add `auto_renew` column to `Subscription` model (Boolean, default True, nullable False)
2. Update Pydantic schemas: `SubscriptionCreate.auto_renew` (default True), `SubscriptionUpdate.auto_renew` (optional), `SubscriptionResponse.auto_renew`
3. Add APScheduler to FastAPI app lifespan — one daily job that:
   - Queries subscriptions where `auto_renew=True`, `status=active`, `next_billing_date <= today`
   - For each match, advances `next_billing_date` by one `billing_cycle`
   - Commits updates
4. Create alembic migration for the new column

### Frontend

1. Add `auto_renew: boolean` to `Subscription` and `SubscriptionCreate` types
2. Add `auto_renew?: boolean` to `SubscriptionUpdate` type
3. Add Switch/toggle to SubscriptionForm for auto_renew
4. Display auto_renew status in subscription list (icon or badge)

### Renewal Logic

- `weekly` → +7 days
- `monthly` → +1 month (relativedelta)
- `quarterly` → +3 months
- `yearly` → +1 year
- If `next_billing_date` is None, skip (no date to advance from)
- Only process `status=active` subscriptions

## Decision (ADR-lite)

**Context**: Need to decide how the backend detects and handles expired billing cycles.
**Decision**: Scheduled task via APScheduler, running daily. Only `active` status subscriptions with `auto_renew=true` are processed. `auto_renew` defaults to True (opt-out).
**Consequences**: Introduces APScheduler as a new dependency. Data freshness depends on scheduled task frequency (daily is sufficient for a tracker app). No renewal history or undo in MVP.

## Out of Scope

* Actual payment processing
* Email/push notifications on renewal
* Renewal history / audit log
* Manual undo of auto-renewal
* Changing billing cycle or price on renewal
* Auto-renewal for `cancelled` or `trial` status subscriptions

## Technical Notes

* Backend model: `backend/app/models/subscription.py`
* Backend schemas: `backend/app/schemas/subscription.py`
* Backend router: `backend/app/routers/subscriptions.py`
* Backend main: `backend/app/main.py` (lifespan for APScheduler init)
* Frontend types: `frontend/src/api/types.ts`
* Frontend API client: `frontend/src/api/subscriptions.ts`
* Frontend form: `frontend/src/components/SubscriptionForm.tsx`
* Frontend pages: `frontend/src/pages/SubscriptionsPage.tsx`
* DB migration needed for `auto_renew` column (Boolean, not null, server default True)
* No existing service layer — business logic in router; renewal logic should go in a new service module
