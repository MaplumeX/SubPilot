from __future__ import annotations

import logging
from datetime import date, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.services.notifications.channels import build_channels
from app.services.notifications.templates import render

logger = logging.getLogger(__name__)


def process_reminders(db: Session) -> int:
    """Scan subscriptions due within each user's reminder window and send reminders.

    For each user with reminders_enabled, find active/trial subscriptions whose
    next_billing_date falls in [today, today + reminder_days] and that have not
    been acknowledged for the current billing date, then dispatch one message
    per enabled channel. Non-cancelled subscriptions only; overdue (past due)
    subscriptions are not reminded (strict window).

    Returns the number of reminder messages sent.
    """
    today = date.today()
    sent_count = 0

    users = db.query(User).filter(User.reminders_enabled.is_(True)).all()
    for user in users:
        window_end = today + timedelta(days=user.reminder_days)
        subs = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user.id,
                Subscription.status != SubscriptionStatus.cancelled,
                Subscription.next_billing_date.isnot(None),
                Subscription.next_billing_date >= today,
                Subscription.next_billing_date <= window_end,
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
