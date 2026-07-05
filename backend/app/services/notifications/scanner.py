from __future__ import annotations

import logging
from datetime import date, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.subscription import ReminderMode, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.notifications.channels import build_channels
from app.services.notifications.templates import render

logger = logging.getLogger(__name__)


def process_reminders(db: Session) -> int:
    """Scan subscriptions due within each user's reminder window and send reminders.

    For each user with reminders_enabled, find non-cancelled subscriptions whose
    next_billing_date falls in the per-subscription effective reminder window
    [today, today + effective_days] and that have not been acknowledged for the
    current billing date, then dispatch one message per enabled channel.

    effective_days per subscription:
      - reminder_mode == default -> User.reminder_days
      - reminder_mode == custom  -> Subscription.reminder_days

    A subscription with reminder_enabled=False is skipped (only affects
    notification sending, not Dashboard due_soon display).

    Returns the number of reminder messages sent.
    """
    today = date.today()
    sent_count = 0

    users = db.query(User).filter(User.reminders_enabled.is_(True)).all()
    for user in users:
        subs = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user.id,
                Subscription.status != SubscriptionStatus.cancelled,
                Subscription.next_billing_date.isnot(None),
                Subscription.next_billing_date >= today,
                or_(
                    Subscription.acknowledged_billing_date.is_(None),
                    Subscription.acknowledged_billing_date != Subscription.next_billing_date,
                ),
            )
            .all()
        )
        if not subs:
            continue

        channels = build_channels(user)
        if not channels:
            continue

        locale = user.locale or "en"
        for sub in subs:
            if not sub.reminder_enabled:
                continue
            if sub.reminder_mode == ReminderMode.custom:
                effective_days = sub.reminder_days if sub.reminder_days is not None else user.reminder_days
            else:
                effective_days = user.reminder_days
            window_end = today + timedelta(days=effective_days)
            if sub.next_billing_date > window_end:
                continue
            days = (sub.next_billing_date - today).days  # type: ignore[operator]
            subject, body = render(locale, sub, days)
            for channel in channels:
                try:
                    channel.send(subject=subject, body=body)
                    sent_count += 1
                except Exception:
                    logger.exception(
                        "Failed sending %s reminder for subscription %s to user %s",
                        channel.name, sub.id, user.id,
                    )

    if sent_count > 0:
        logger.info("Sent %d reminder message(s)", sent_count)
    return sent_count
