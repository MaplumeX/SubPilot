# Align next_billing_date to future on create/update

## Goal

When a user adds a historical subscription (start_date far in the past, already
renewed many times), the stored `next_billing_date` should land in the future
aligned to the real billing cadence — not sit stale at `start_date + 1 cycle`
in the past.

## Background

- `_compute_next_billing_date(start_date, cycle_count, cycle_unit)` returns
  `start_date + one cycle`. It does NOT compare against today.
- The scheduled `process_renewals` job only advances `auto_renew=True`
  subscriptions; `auto_renew=False` subscriptions with a past `next_billing_date`
  are never corrected.
- `forecast.py` has a read-only defensive catch-up loop, but it does not write
  the corrected value back to the DB.
- Net effect: a non-auto-renew historical subscription keeps a stale past
  `next_billing_date` forever; even auto-renew ones rely on the scheduled job
  eventually firing.

## Requirements

1. On **create**, after computing the initial `next_billing_date` from
   `start_date + cycle`, if that date is `<= today`, advance it repeatedly by
   one cycle until it is strictly in the future (`> today`).
2. On **update**, when `start_date` / `cycle_count` / `cycle_unit` changes and
   `next_billing_date` is recomputed, apply the same future-alignment loop.
3. Reuse the existing `advance_next_billing_date` from
   `app/services/renewal.py` so cycle math stays single-sourced (no second
   implementation of the cycle-step).
4. Guard against infinite loops with the same catch-up budget pattern used in
   `forecast.py` (`_MAX_CATCH_UP`). If the budget is exhausted, leave the date
   as-is (do not crash).
5. Do NOT change `process_renewals` — it stays as a safety net for downtime.
6. Do NOT change `forecast.py`'s defensive catch-up — it stays as read-only
   insurance.

## Acceptance Criteria

- [ ] Creating a subscription with `start_date` 2 years in the past, cycle 1
      month, results in `next_billing_date` in the future (> today), aligned to
      the same day-of-month as `start_date`.
- [ ] Creating a subscription with `start_date` in the future results in
      `next_billing_date = start_date + one cycle` (unchanged behavior, no
      over-advancement).
- [ ] Updating `start_date` to a far-past date recomputes `next_billing_date`
      into the future.
- [ ] `auto_renew=False` subscriptions also get aligned on create/update (this
      is the primary fix — they were the ones stuck in the past).
- [ ] Unit/contract test(s) covering the past-start-date create path.
- [ ] No new cycle-math implementation; `advance_next_billing_date` is reused.

## Out of Scope

- Backfill job for existing rows already in the DB with stale past
  `next_billing_date` (could be a follow-up task).
- Changing `process_renewals` or `forecast.py` behavior.
- UI changes to `SubscriptionForm.tsx`.