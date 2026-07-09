"""Billing cashflow projection for future charges.

Projects actual charge events (price × FX rate), not monthly-normalized costs.
Reuses advance_next_billing_date so cycle math stays single-sourced.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Callable, Iterable, Sequence

from dateutil.relativedelta import relativedelta

from app.models.subscription import Subscription, SubscriptionStatus
from app.services.renewal import advance_next_billing_date

# Safety cap for day/week cycles over a 12-month window.
_MAX_ITERATIONS = 400
# Separate budget for advancing a stale next_billing_date up to today.
_MAX_CATCH_UP = 2000


@dataclass(frozen=True)
class ChargeEvent:
    subscription_id: int
    name: str
    billing_date: date
    amount: float


@dataclass
class MonthlyBucket:
    year_month: str  # "YYYY-MM"
    total: float
    items: list[ChargeEvent]


def month_end(year: int, month: int) -> date:
    """Last calendar day of the given year/month."""
    return date(year, month, calendar.monthrange(year, month)[1])


def forecast_window_end(today: date, months: int = 12) -> date:
    """Last day of the calendar month that is (months-1) months after today's month."""
    start = date(today.year, today.month, 1)
    end_month = start + relativedelta(months=months - 1)
    return month_end(end_month.year, end_month.month)


def year_month_keys(today: date, months: int = 12) -> list[str]:
    """Exactly `months` YYYY-MM keys starting at today's calendar month."""
    keys: list[str] = []
    cursor = date(today.year, today.month, 1)
    for _ in range(months):
        keys.append(f"{cursor.year:04d}-{cursor.month:02d}")
        cursor = cursor + relativedelta(months=1)
    return keys


def project_charges(
    subscriptions: Iterable[Subscription],
    get_rate: Callable[[str], float],
    today: date,
    window_end: date,
) -> list[ChargeEvent]:
    """Project charge events for active subscriptions within [today, window_end].

    - amount = round(price * rate, 2)  (raw price, not monthly-normalized)
    - auto_renew=False → at most one charge (the current next_billing_date)
    - auto_renew=True → roll with advance_next_billing_date until past window_end
    """
    events: list[ChargeEvent] = []

    for sub in subscriptions:
        if sub.status != SubscriptionStatus.active:
            continue
        if sub.next_billing_date is None:
            continue

        rate = get_rate(sub.currency)
        amount = round(sub.price * rate, 2)
        billing_date = sub.next_billing_date

        # auto_renew=false: consider only the first next_billing_date
        if not sub.auto_renew:
            if today <= billing_date <= window_end:
                events.append(
                    ChargeEvent(
                        subscription_id=sub.id,
                        name=sub.name,
                        billing_date=billing_date,
                        amount=amount,
                    )
                )
            continue

        # Defensive catch-up: renewal job normally keeps next_billing_date in the
        # future, but after downtime a day-cycle sub can be far behind. Fast-forward
        # past dates without consuming the in-window safety budget.
        skip_guard = 0
        while billing_date < today and skip_guard < _MAX_CATCH_UP:
            billing_date = advance_next_billing_date(
                billing_date, sub.cycle_count, sub.cycle_unit
            )
            skip_guard += 1
        if billing_date < today:
            # Still behind after catch-up budget — skip this subscription.
            continue

        iterations = 0
        while billing_date <= window_end and iterations < _MAX_ITERATIONS:
            events.append(
                ChargeEvent(
                    subscription_id=sub.id,
                    name=sub.name,
                    billing_date=billing_date,
                    amount=amount,
                )
            )
            billing_date = advance_next_billing_date(
                billing_date, sub.cycle_count, sub.cycle_unit
            )
            iterations += 1

    return events


def group_by_month(
    events: Sequence[ChargeEvent],
    today: date,
    months: int = 12,
) -> list[MonthlyBucket]:
    """Bucket charge events into exactly `months` calendar months (zeros included)."""
    keys = year_month_keys(today, months)
    buckets: dict[str, MonthlyBucket] = {
        key: MonthlyBucket(year_month=key, total=0.0, items=[]) for key in keys
    }

    for event in events:
        key = f"{event.billing_date.year:04d}-{event.billing_date.month:02d}"
        bucket = buckets.get(key)
        if bucket is None:
            continue
        bucket.items.append(event)
        bucket.total = round(bucket.total + event.amount, 2)

    # Sort items within each month by billing date then name for stable UI
    for bucket in buckets.values():
        bucket.items.sort(key=lambda e: (e.billing_date, e.name, e.subscription_id))

    return [buckets[key] for key in keys]


def sum_next_30_days(events: Sequence[ChargeEvent], today: date) -> float:
    """Sum charge amounts where today <= billing_date <= today+30."""
    window_end = today + timedelta(days=30)
    total = 0.0
    for event in events:
        if today <= event.billing_date <= window_end:
            total += event.amount
    return round(total, 2)


def build_forecast(
    subscriptions: Iterable[Subscription],
    get_rate: Callable[[str], float],
    today: date | None = None,
    months: int = 12,
) -> tuple[list[MonthlyBucket], float]:
    """One projection pass → 12 monthly buckets + next_30_days_total."""
    if today is None:
        today = date.today()
    window_end = forecast_window_end(today, months)
    events = project_charges(subscriptions, get_rate, today, window_end)
    monthly = group_by_month(events, today, months)
    next_30 = sum_next_30_days(events, today)
    return monthly, next_30
