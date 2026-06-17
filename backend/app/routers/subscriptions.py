import os
import uuid
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.exchange_rate import ExchangeRate
from app.models.subscription import CycleUnit, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.exchange_rate import get_rate
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionStats,
    SubscriptionUpdate,
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/svg+xml", "image/gif"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
LOGOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "logos")

SORTABLE_FIELDS = {"name", "converted_price", "next_billing_date"}

_CYCLE_MULTIPLIER = case(
    (Subscription.cycle_unit == CycleUnit.day, Subscription.price * Subscription.cycle_count * 365.0 / 12),
    (Subscription.cycle_unit == CycleUnit.week, Subscription.price * Subscription.cycle_count * 52.0 / 12),
    (Subscription.cycle_unit == CycleUnit.month, Subscription.price * Subscription.cycle_count),
    (Subscription.cycle_unit == CycleUnit.year, Subscription.price * Subscription.cycle_count / 12.0),
    else_=Subscription.price,
)


router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


def _normalize_to_monthly(price: float, cycle_count: int, cycle_unit: CycleUnit) -> float:
    if cycle_unit == CycleUnit.day:
        return price * cycle_count * 365 / 12
    if cycle_unit == CycleUnit.week:
        return price * cycle_count * 52 / 12
    if cycle_unit == CycleUnit.month:
        return price * cycle_count
    if cycle_unit == CycleUnit.year:
        return price * cycle_count / 12
    return price


def _compute_next_billing_date(start_date: date, cycle_count: int, cycle_unit: CycleUnit) -> date:
    if cycle_unit == CycleUnit.day:
        return start_date + timedelta(days=cycle_count)
    if cycle_unit == CycleUnit.week:
        return start_date + timedelta(weeks=cycle_count)
    if cycle_unit == CycleUnit.month:
        return start_date + relativedelta(months=cycle_count)
    if cycle_unit == CycleUnit.year:
        return start_date + relativedelta(years=cycle_count)
    return start_date


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
    dump = data.model_dump()
    dump["next_billing_date"] = _compute_next_billing_date(
        data.start_date, data.cycle_count, data.cycle_unit
    )
    subscription = Subscription(user_id=current_user.id, **dump)
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    base = current_user.base_currency
    monthly = _normalize_to_monthly(subscription.price, subscription.cycle_count, subscription.cycle_unit)
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = round(monthly * rate, 2)  # type: ignore[attr-defined]
    return subscription


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(
    category: str | None = Query(None),
    status: SubscriptionStatus | None = Query(None),
    sort_by: str | None = Query(None),
    sort_order: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if sort_by is not None and sort_by not in SORTABLE_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by. Allowed: {', '.join(sorted(SORTABLE_FIELDS))}",
        )
    if sort_order is not None and sort_order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort_order must be 'asc' or 'desc'",
        )

    query = db.query(Subscription).filter(Subscription.user_id == current_user.id)
    if category is not None:
        query = query.filter(Subscription.category == category)
    if status is not None:
        query = query.filter(Subscription.status == status)

    if sort_by == "converted_price":
        latest_rate_subq = (
            db.query(
                ExchangeRate.base_currency,
                ExchangeRate.target_currency,
                func.max(ExchangeRate.date).label("max_date"),
            )
            .filter(ExchangeRate.target_currency == current_user.base_currency)
            .group_by(ExchangeRate.base_currency, ExchangeRate.target_currency)
            .subquery()
        )
        rate_subq = (
            db.query(ExchangeRate)
            .join(
                latest_rate_subq,
                and_(
                    ExchangeRate.base_currency == latest_rate_subq.c.base_currency,
                    ExchangeRate.target_currency == latest_rate_subq.c.target_currency,
                    ExchangeRate.date == latest_rate_subq.c.max_date,
                ),
            )
            .subquery()
        )
        query = query.join(
            rate_subq,
            Subscription.currency == rate_subq.c.base_currency,
            isouter=True,
        )
        rate_expr = func.coalesce(rate_subq.c.rate, 1.0)
        order_expr = _CYCLE_MULTIPLIER * rate_expr
    elif sort_by == "name":
        order_expr = Subscription.name
    elif sort_by == "next_billing_date":
        order_expr = Subscription.next_billing_date
    else:
        order_expr = Subscription.created_at

    if sort_order == "desc" or (sort_order is None and sort_by is None):
        if sort_by == "next_billing_date":
            query = query.order_by(order_expr.desc().nullslast())
        else:
            query = query.order_by(order_expr.desc())
    else:
        if sort_by == "next_billing_date":
            query = query.order_by(order_expr.asc().nullslast())
        else:
            query = query.order_by(order_expr.asc())

    subs = query.all()
    base = current_user.base_currency
    for sub in subs:
        monthly = _normalize_to_monthly(sub.price, sub.cycle_count, sub.cycle_unit)
        rate = get_rate(db, sub.currency, base)
        sub.converted_price = round(monthly * rate, 2)  # type: ignore[attr-defined]
    return subs


@router.get("/categories", response_model=list[str])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Subscription.category)
        .filter(Subscription.user_id == current_user.id, Subscription.category.isnot(None))
        .distinct()
        .order_by(Subscription.category)
        .all()
    )
    return [row[0] for row in rows]


@router.get("/stats", response_model=SubscriptionStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = current_user.base_currency
    subscriptions = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id, Subscription.status == SubscriptionStatus.active)
        .all()
    )

    total_monthly = 0.0
    by_category: dict[str, float] = {}
    converted_prices: list[tuple[str, float]] = []

    for sub in subscriptions:
        monthly = _normalize_to_monthly(sub.price, sub.cycle_count, sub.cycle_unit)
        rate = get_rate(db, sub.currency, base)
        converted = monthly * rate
        total_monthly += converted
        cat = sub.category
        by_category[cat] = by_category.get(cat, 0.0) + converted
        converted_prices.append((sub.name, converted))

    count = len(subscriptions)
    avg_monthly = round(total_monthly / count, 2) if count else 0.0

    sorted_prices = sorted(converted_prices, key=lambda x: x[1], reverse=True)
    most_expensive = None
    cheapest = None
    if sorted_prices:
        most_expensive = {"name": sorted_prices[0][0], "amount": round(sorted_prices[0][1], 2)}
        cheapest = {"name": sorted_prices[-1][0], "amount": round(sorted_prices[-1][1], 2)}

    top3_sum = sum(p for _, p in sorted_prices[:3])
    top3_percentage = round(top3_sum / total_monthly * 100, 2) if total_monthly else 0.0

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
        count=count,
        due_soon=due_soon_subs,
        base_currency=base,
        avg_monthly=avg_monthly,
        most_expensive=most_expensive,
        cheapest=cheapest,
        top3_percentage=top3_percentage,
    )


@router.post("/upload-logo")
def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPG, PNG, SVG, GIF",
        )
    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 2MB limit",
        )

    os.makedirs(LOGOS_DIR, exist_ok=True)

    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/svg+xml": "svg",
        "image/gif": "gif",
    }
    ext = ext_map.get(file.content_type, "png") if file.content_type else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(LOGOS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"logo_url": f"/static/logos/{filename}"}


@router.post("/{subscription_id}/acknowledge", response_model=SubscriptionResponse)
def acknowledge_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a subscription's current billing date as acknowledged.

    Sets acknowledged_billing_date = next_billing_date so reminders stop until the
    next billing cycle. Does NOT modify next_billing_date.
    """
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    _check_ownership(subscription, current_user.id)
    subscription.acknowledged_billing_date = subscription.next_billing_date
    db.commit()
    db.refresh(subscription)
    base = current_user.base_currency
    monthly = _normalize_to_monthly(subscription.price, subscription.cycle_count, subscription.cycle_unit)
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = round(monthly * rate, 2)  # type: ignore[attr-defined]
    return subscription


@router.get("/payment-methods", response_model=list[str])
def list_payment_methods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Subscription.payment_method)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.payment_method != "",
        )
        .distinct()
        .order_by(Subscription.payment_method)
        .all()
    )
    return [row[0] for row in rows]


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    _check_ownership(subscription, current_user.id)
    base = current_user.base_currency
    monthly = _normalize_to_monthly(subscription.price, subscription.cycle_count, subscription.cycle_unit)
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = round(monthly * rate, 2)  # type: ignore[attr-defined]
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

    cycle_changed = "cycle_count" in update_data or "cycle_unit" in update_data
    start_changed = "start_date" in update_data
    if cycle_changed or start_changed:
        subscription.next_billing_date = _compute_next_billing_date(
            subscription.start_date, subscription.cycle_count, subscription.cycle_unit
        )

    db.commit()
    db.refresh(subscription)
    base = current_user.base_currency
    monthly = _normalize_to_monthly(subscription.price, subscription.cycle_count, subscription.cycle_unit)
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = round(monthly * rate, 2)  # type: ignore[attr-defined]
    return subscription


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    _check_ownership(subscription, current_user.id)

    # Clean up uploaded logo file if it's a local file
    if subscription.logo_url and subscription.logo_url.startswith("/static/logos/"):
        logo_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            subscription.logo_url.lstrip("/"),
        )
        if os.path.exists(logo_path):
            os.remove(logo_path)

    db.delete(subscription)
    db.commit()
