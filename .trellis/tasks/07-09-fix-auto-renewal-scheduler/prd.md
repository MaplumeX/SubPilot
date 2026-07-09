# Fix auto-renewal scheduler so it actually runs

## Goal

Make the existing auto-renewal background job actually execute in real deployments/dev sessions, so eligible subscriptions advance `next_billing_date` without manual intervention — including catching up multiple missed cycles after downtime.

## Problem

Auto-renewal is implemented (`process_renewals` + APScheduler job `auto_renewal`), but it does not fire soon enough (or at all in typical dev reloads):

- Job is registered as `interval days=1` and is **not** invoked on app startup
- APScheduler interval jobs first run at roughly `now + interval`, not immediately
- Dev `--reload` restarts reset the interval timer, so the daily job may never run
- Contrast: exchange-rate job is both scheduled **and** called once on startup; renewals are not
- Current `process_renewals` advances **only one cycle per run**, so long downtime leaves dates still overdue after a single fire

Observed local evidence (2026-07-09):

- Subscription `tes`: `auto_renew=1`, `status=active`, `next_billing_date=2026-07-08` (overdue), still not advanced
- Expected advance (1 cycle overdue): `2026-07-08` + 1 month → `2026-08-08`

## Requirements

- On FastAPI app startup, run auto-renewal processing once immediately (same pattern as exchange rates)
- Keep a daily scheduled job so renewals continue while the process stays up (retain existing APScheduler `interval days=1` style; do not introduce cron/timezone policy in this fix)
- Preserve existing eligibility rules:
  - `auto_renew=True`
  - `status=active`
  - `next_billing_date` is not null and `<= today`
- **Catch-up**: for each eligible subscription, advance `next_billing_date` by one cycle **repeatedly until `next_billing_date > today`** (not just once per job run)
- Use existing cycle math (`advance_next_billing_date` / day·week·month·year + `cycle_count`)
- Do not change payment behavior (still tracking-only; no real charges)
- Do not change reminder acknowledge semantics / double-advance protection (`acknowledged_billing_date` remains a separate marker; renewals only touch `next_billing_date`)
- Do not expand this fix to the reminder job (same startup gap may exist, but out of scope unless later requested)

## Acceptance Criteria

- [ ] App startup triggers one `_run_renewals()` (or equivalent) before/with scheduler start
- [ ] Daily auto-renewal job remains registered and will run while the process is alive
- [ ] An eligible subscription overdue by **one** cycle advances to the next future billing date on startup/job run
- [ ] An eligible subscription overdue by **multiple** cycles is fully caught up in a **single** job run (`next_billing_date > today` afterward)
- [ ] Ineligible subscriptions (auto_renew off / non-active / future billing date / null billing date) are unchanged
- [ ] Existing renewal cycle unit math is unchanged (day/week/month/year via current helper)
- [ ] Logging still reports how many subscriptions were renewed (at least subscription-level count; cycle-level detail optional)
- [ ] No regression to exchange-rate or reminder job registration

## Out of Scope

- Real payment processing / payment gateway integration
- Renewal history / audit log / undo
- Changing reminder content, reminder eligibility, or reminder scheduler startup behavior
- Multi-worker / distributed lock for multi-process deployments (single-process assumption remains)
- Fixed clock-time cron / timezone-aware “bill at midnight local” product behavior (explicitly deferred; keep interval + startup run)

## Notes

- Lightweight bugfix with a small logic change (catch-up loop); PRD-only is likely sufficient
- Current scheduler code: `backend/app/main.py`
- Current renewal logic: `backend/app/services/renewal.py`
