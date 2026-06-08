from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.subscription import BillingCycle, Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionStats,
    SubscriptionUpdate,
)

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


def _normalize_to_monthly(price: float, cycle: BillingCycle) -> float:
    if cycle == BillingCycle.weekly:
        return price * 52 / 12
    if cycle == BillingCycle.monthly:
        return price
    if cycle == BillingCycle.quarterly:
        return price / 3
    if cycle == BillingCycle.yearly:
        return price / 12
    return price


def _check_ownership(subscription: Subscription | None, user_id: int) -> None:
    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    if subscription.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = Subscription(user_id=current_user.id, **data.model_dump())
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(
    category: str | None = Query(None),
    status: SubscriptionStatus | None = Query(None),
    billing_cycle: BillingCycle | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Subscription).filter(Subscription.user_id == current_user.id)
    if category is not None:
        query = query.filter(Subscription.category == category)
    if status is not None:
        query = query.filter(Subscription.status == status)
    if billing_cycle is not None:
        query = query.filter(Subscription.billing_cycle == billing_cycle)
    return query.all()


@router.get("/stats", response_model=SubscriptionStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscriptions = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id, Subscription.status == SubscriptionStatus.active)
        .all()
    )

    total_monthly = 0.0
    by_category: dict[str, float] = {}

    for sub in subscriptions:
        monthly = _normalize_to_monthly(sub.price, sub.billing_cycle)
        total_monthly += monthly
        cat = sub.category or "other"
        by_category[cat] = by_category.get(cat, 0.0) + monthly

    today = date.today()
    three_days = today + timedelta(days=3)
    due_soon_subs = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
            Subscription.next_billing_date.isnot(None),
            Subscription.next_billing_date >= today,
            Subscription.next_billing_date <= three_days,
        )
        .all()
    )

    return SubscriptionStats(
        total_monthly=round(total_monthly, 2),
        total_yearly=round(total_monthly * 12, 2),
        by_category={k: round(v, 2) for k, v in by_category.items()},
        count=len(subscriptions),
        due_soon=due_soon_subs,
    )


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    _check_ownership(subscription, current_user.id)
    return subscription


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    _check_ownership(subscription, current_user.id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subscription, field, value)

    db.commit()
    db.refresh(subscription)
    return subscription


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    _check_ownership(subscription, current_user.id)
    db.delete(subscription)
    db.commit()
