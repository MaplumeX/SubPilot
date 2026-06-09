from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.models.subscription import CycleUnit, Subscription, SubscriptionStatus


def advance_next_billing_date(next_date: date, cycle_count: int, cycle_unit: CycleUnit) -> date:
    """Advance a billing date by one cycle."""
    if cycle_unit == CycleUnit.day:
        return next_date + timedelta(days=cycle_count)

    if cycle_unit == CycleUnit.week:
        return next_date + timedelta(weeks=cycle_count)

    if cycle_unit == CycleUnit.month:
        return next_date + relativedelta(months=cycle_count)

    if cycle_unit == CycleUnit.year:
        return next_date + relativedelta(years=cycle_count)

    return next_date


def process_renewals(db: Session) -> int:
    """Process auto-renewals for all eligible subscriptions.

    Queries subscriptions where auto_renew=True, status=active,
    and next_billing_date <= today. Advances each by one billing cycle.

    Returns the count of renewed subscriptions.
    """
    today = date.today()

    subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.auto_renew.is_(True),
            Subscription.status == SubscriptionStatus.active,
            Subscription.next_billing_date.isnot(None),
            Subscription.next_billing_date <= today,
        )
        .all()
    )

    count = 0
    for sub in subscriptions:
        sub.next_billing_date = advance_next_billing_date(
            sub.next_billing_date, sub.cycle_count, sub.cycle_unit
        )
        count += 1

    if count > 0:
        db.commit()

    return count
