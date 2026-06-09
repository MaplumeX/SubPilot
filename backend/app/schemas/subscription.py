from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.subscription import CycleUnit, SubscriptionStatus


class SubscriptionCreate(BaseModel):
    name: str
    price: float = Field(gt=0)
    currency: str = "CNY"
    cycle_count: int = Field(ge=1)
    cycle_unit: CycleUnit
    category: str | None = None
    status: SubscriptionStatus = SubscriptionStatus.active
    start_date: date
    auto_renew: bool = True
    notes: str | None = None
    logo_url: str | None = None


class SubscriptionUpdate(BaseModel):
    name: str | None = None
    price: float | None = Field(default=None, gt=0)
    currency: str | None = None
    cycle_count: int | None = Field(default=None, ge=1)
    cycle_unit: CycleUnit | None = None
    category: str | None = None
    status: SubscriptionStatus | None = None
    start_date: date | None = None
    auto_renew: bool | None = None
    notes: str | None = None
    logo_url: str | None = None


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    name: str
    price: float
    currency: str
    cycle_count: int
    cycle_unit: CycleUnit
    category: str | None
    status: SubscriptionStatus
    start_date: date
    next_billing_date: date | None
    auto_renew: bool
    notes: str | None
    logo_url: str | None
    created_at: datetime
    updated_at: datetime | None
    converted_price: float | None = None

    model_config = {"from_attributes": True}


class SubscriptionStats(BaseModel):
    total_monthly: float
    total_yearly: float
    by_category: dict[str, float]
    count: int
    due_soon: list[SubscriptionResponse]
    base_currency: str = "CNY"
