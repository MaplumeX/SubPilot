from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.subscription import BillingCycle, SubscriptionStatus


class SubscriptionCreate(BaseModel):
    name: str
    price: float = Field(gt=0)
    currency: str = "CNY"
    billing_cycle: BillingCycle
    category: str | None = None
    status: SubscriptionStatus = SubscriptionStatus.active
    start_date: date
    next_billing_date: date | None = None
    auto_renew: bool = True
    notes: str | None = None


class SubscriptionUpdate(BaseModel):
    name: str | None = None
    price: float | None = Field(default=None, gt=0)
    currency: str | None = None
    billing_cycle: BillingCycle | None = None
    category: str | None = None
    status: SubscriptionStatus | None = None
    start_date: date | None = None
    next_billing_date: date | None = None
    auto_renew: bool | None = None
    notes: str | None = None


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    name: str
    price: float
    currency: str
    billing_cycle: BillingCycle
    category: str | None
    status: SubscriptionStatus
    start_date: date
    next_billing_date: date | None
    auto_renew: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class SubscriptionStats(BaseModel):
    total_monthly: float
    total_yearly: float
    by_category: dict[str, float]
    count: int
    due_soon: list[SubscriptionResponse]
