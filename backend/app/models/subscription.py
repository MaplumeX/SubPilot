import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.database import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.payment_method import PaymentMethod
    from app.models.user import User


class CycleUnit(str, enum.Enum):
    day = "day"
    week = "week"
    month = "month"
    year = "year"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    trial = "trial"


class ReminderMode(str, enum.Enum):
    default = "default"
    custom = "custom"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="CNY")
    cycle_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    cycle_unit: Mapped[CycleUnit] = mapped_column(
        Enum(CycleUnit), nullable=False
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True
    )
    payment_method_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.active
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    acknowledged_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    auto_renew: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("1"), nullable=False
    )
    reminder_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("1"), nullable=False
    )
    reminder_mode: Mapped[ReminderMode] = mapped_column(
        Enum(ReminderMode), nullable=False, default=ReminderMode.default,
        server_default=text("'default'"),
    )
    reminder_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=_utcnow)

    user: Mapped["User"] = relationship(back_populates="subscriptions")
    category: Mapped["Category | None"] = relationship("Category")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod")
