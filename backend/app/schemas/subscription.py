from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.subscription import CycleUnit, SubscriptionStatus
from app.schemas.category import CategoryBrief
from app.schemas.payment_method import PaymentMethodBrief


class SubscriptionCreate(BaseModel):
    name: str
    price: float = Field(gt=0)
    currency: str = "CNY"
    cycle_count: int = Field(ge=1)
    cycle_unit: CycleUnit
    category_id: int | None = None
    payment_method_id: int
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
    category_id: int | None = None
    payment_method_id: int | None = Field(default=None)
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
    category: CategoryBrief | None
    payment_method: PaymentMethodBrief
    status: SubscriptionStatus
    start_date: date
    next_billing_date: date | None
    acknowledged_billing_date: date | None = None
    auto_renew: bool
    notes: str | None
    logo_url: str | None
    created_at: datetime
    updated_at: datetime | None
    converted_price: float | None = None

    model_config = {"from_attributes": True}


class SubscriptionBrief(BaseModel):
    name: str
    amount: float


class SubscriptionStats(BaseModel):
    total_monthly: float
    total_yearly: float
    by_category: dict[str, float]
    count: int
    due_soon: list[SubscriptionResponse]
    base_currency: str = "CNY"
    avg_monthly: float = 0.0
    most_expensive: SubscriptionBrief | None = None
    cheapest: SubscriptionBrief | None = None
    top3_percentage: float = 0.0
