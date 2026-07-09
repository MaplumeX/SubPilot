from __future__ import annotations

import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.subscription import ReminderMode, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.notifications.channels import build_channels
from app.services.notifications.templates import render

logger = logging.getLogger(__name__)


def _parse_reminder_time(value: str) -> time | None:
    try:
        hour_s, minute_s = value.split(":", 1)
        hour = int(hour_s)
        minute = int(minute_s)
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            return None
        return time(hour=hour, minute=minute)
    except (TypeError, ValueError, AttributeError):
        return None


def process_reminders(db: Session) -> int:
    """Scan subscriptions due within each user's reminder window and send reminders.

    For each user with reminders_enabled, evaluate once per local calendar day at
    or after their preferred local send time. Due windows use the user's local
    "today". After handling a user (including no channels / no due subs), mark
    last_reminder_local_date so later ticks the same local day no-op.

    effective_days per subscription:
      - reminder_mode == default -> User.reminder_days
      - reminder_mode == custom  -> Subscription.reminder_days

    A subscription with reminder_enabled=False is skipped (only affects
    notification sending, not Dashboard due_soon display).

    Returns the number of reminder messages sent.
    """
    sent_count = 0

    users = db.query(User).filter(User.reminders_enabled.is_(True)).all()
    for user in users:
        try:
            tz = ZoneInfo(user.timezone)
        except (ZoneInfoNotFoundError, KeyError, ValueError):
            logger.warning(
                "Skipping user %s: invalid timezone %r",
                user.id,
                user.timezone,
            )
            continue

        local_now = datetime.now(tz)
        local_today = local_now.date()
        local_t = local_now.time().replace(second=0, microsecond=0)

        preferred = _parse_reminder_time(user.reminder_time)
        if preferred is None:
            logger.warning(
                "Skipping user %s: invalid reminder_time %r",
                user.id,
                user.reminder_time,
            )
            continue

        if local_t < preferred:
            continue

        if user.last_reminder_local_date == local_today:
            continue

        subs = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user.id,
                Subscription.status != SubscriptionStatus.cancelled,
                Subscription.next_billing_date.isnot(None),
                Subscription.next_billing_date >= local_today,
                or_(
                    Subscription.acknowledged_billing_date.is_(None),
                    Subscription.acknowledged_billing_date != Subscription.next_billing_date,
                ),
            )
            .all()
        )

        channels = build_channels(user)
        if channels and subs:
            locale = user.locale or "en"
            for sub in subs:
                if not sub.reminder_enabled:
                    continue
                if sub.reminder_mode == ReminderMode.custom:
                    effective_days = (
                        sub.reminder_days
                        if sub.reminder_days is not None
                        else user.reminder_days
                    )
                else:
                    effective_days = user.reminder_days
                window_end = local_today + timedelta(days=effective_days)
                if sub.next_billing_date > window_end:
                    continue
                days = (sub.next_billing_date - local_today).days  # type: ignore[operator]
                subject, body = render(locale, sub, days)
                for channel in channels:
                    try:
                        channel.send(subject=subject, body=body)
                        sent_count += 1
                    except Exception:
                        logger.exception(
                            "Failed sending %s reminder for subscription %s to user %s",
                            channel.name,
                            sub.id,
                            user.id,
                        )

        # Mark day even if 0 sends / no channels, so we do not re-scan every minute.
        user.last_reminder_local_date = local_today
        db.commit()

    if sent_count > 0:
        logger.info("Sent %d reminder message(s)", sent_count)
    return sent_count
