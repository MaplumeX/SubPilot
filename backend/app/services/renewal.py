import calendar
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.subscription import BillingCycle, Subscription, SubscriptionStatus


def advance_next_billing_date(next_date: date, cycle: BillingCycle) -> date:
    """Advance a billing date by one cycle."""
    if cycle == BillingCycle.weekly:
        return next_date + timedelta(days=7)

    if cycle == BillingCycle.yearly:
        try:
            return next_date.replace(year=next_date.year + 1)
        except ValueError:
            # Feb 29 in a leap year -> Feb 28 in a non-leap year
            return next_date.replace(month=2, day=28, year=next_date.year + 1)

    # Monthly or quarterly
    months = 1 if cycle == BillingCycle.monthly else 3

    new_month = next_date.month + months
    new_year = next_date.year + (new_month - 1) // 12
    new_month = (new_month - 1) % 12 + 1

    max_day = calendar.monthrange(new_year, new_month)[1]
    new_day = min(next_date.day, max_day)

    return date(new_year, new_month, new_day)


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
            sub.next_billing_date, sub.billing_cycle
        )
        count += 1

    if count > 0:
        db.commit()

    return count
