import os
import uuid
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db
from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
from app.models.payment_method import PaymentMethod
from app.models.subscription import CycleUnit, ReminderMode, Subscription, SubscriptionStatus
from app.models.user import User
from app.services import logo_search, ssrf
from app.services.exchange_rate import get_rate
from app.services.forecast import build_forecast
from app.services.renewal import advance_next_billing_date
from app.schemas.subscription import (
    CacheLogoRequest,
    ForecastChargeItem,
    MonthlyForecast,
    SubscriptionCreate,
    SubscriptionForecast,
    SubscriptionResponse,
    SubscriptionStats,
    SubscriptionUpdate,
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
LOGOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "logos")

EXT_MAP = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
}

SORTABLE_FIELDS = {"name", "converted_price", "next_billing_date"}

# Catch-up budget mirroring forecast.py's _MAX_CATCH_UP guard.
_MAX_CATCH_UP = 2000

_CYCLE_MULTIPLIER = case(
    (Subscription.cycle_unit == CycleUnit.day, Subscription.price / Subscription.cycle_count * 365.0 / 12),
    (Subscription.cycle_unit == CycleUnit.week, Subscription.price / Subscription.cycle_count * 52.0 / 12),
    (Subscription.cycle_unit == CycleUnit.month, Subscription.price / Subscription.cycle_count),
    (Subscription.cycle_unit == CycleUnit.year, Subscription.price / Subscription.cycle_count / 12.0),
    else_=Subscription.price,
)


router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


def _converted_price(price: float, rate: float) -> float:
    """Single-cycle converted price: ``price * rate`` (no monthly normalization)."""
    return round(price * rate, 2)


def _normalize_to_monthly(price: float, cycle_count: int, cycle_unit: CycleUnit) -> float:
    if cycle_unit == CycleUnit.day:
        return price / cycle_count * 365 / 12
    if cycle_unit == CycleUnit.week:
        return price / cycle_count * 52 / 12
    if cycle_unit == CycleUnit.month:
        return price / cycle_count
    if cycle_unit == CycleUnit.year:
        return price / cycle_count / 12
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


def _align_to_future(
    next_date: date, cycle_count: int, cycle_unit: CycleUnit, today: date | None = None
) -> date:
    """Advance *next_date* by full cycles until it is strictly in the future.

    Used on create/update so a historical subscription (start_date far in the
    past) doesn't keep a stale past next_billing_date. Reuses
    ``advance_next_billing_date`` so cycle math stays single-sourced. If the
    catch-up budget is exhausted the date is left as-is (never crashes).
    """
    if today is None:
        today = date.today()
    guard = 0
    while next_date <= today and guard < _MAX_CATCH_UP:
        next_date = advance_next_billing_date(next_date, cycle_count, cycle_unit)
        guard += 1
    return next_date


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


def _validate_category_ownership(db: Session, category_id: int | None, user_id: int) -> None:
    if category_id is None:
        return
    exists = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user_id)
        .first()
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )


def _validate_payment_method_ownership(db: Session, payment_method_id: int | None, user_id: int) -> None:
    if payment_method_id is None:
        return
    exists = (
        db.query(PaymentMethod)
        .filter(PaymentMethod.id == payment_method_id, PaymentMethod.user_id == user_id)
        .first()
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )


def _eager_load(query):
    return query.options(joinedload(Subscription.category), joinedload(Subscription.payment_method))


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_category_ownership(db, data.category_id, current_user.id)
    _validate_payment_method_ownership(db, data.payment_method_id, current_user.id)
    dump = data.model_dump()
    next_date = _compute_next_billing_date(
        data.start_date, data.cycle_count, data.cycle_unit
    )
    dump["next_billing_date"] = _align_to_future(next_date, data.cycle_count, data.cycle_unit)
    subscription = Subscription(user_id=current_user.id, **dump)
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    base = current_user.base_currency
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = _converted_price(subscription.price, rate)  # type: ignore[attr-defined]
    return subscription


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(
    category: int | None = Query(None),
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
        query = query.filter(Subscription.category_id == category)
    if status is not None:
        query = query.filter(Subscription.status == status)
    query = query.options(joinedload(Subscription.category), joinedload(Subscription.payment_method))

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
        rate = get_rate(db, sub.currency, base)
        sub.converted_price = _converted_price(sub.price, rate)  # type: ignore[attr-defined]
    return subs


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
        cat = sub.category.name if sub.category else None
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
    # Per-subscription effective reminder window (D2/D3). Pull all active,
    # unacknowledged, dated subs once, then filter in Python by each sub's
    # effective days (default -> user.reminder_days, custom -> sub.reminder_days).
    # Not affected by sub.reminder_enabled (D2: that only gates notifications).
    candidate_subs = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
            Subscription.next_billing_date.isnot(None),
            Subscription.next_billing_date >= today,
            or_(
                Subscription.acknowledged_billing_date.is_(None),
                Subscription.acknowledged_billing_date != Subscription.next_billing_date,
            ),
        )
        .all()
    )
    user_reminder_days = current_user.reminder_days
    due_soon_subs = []
    for sub in candidate_subs:
        if sub.reminder_mode == ReminderMode.custom:
            effective_days = sub.reminder_days if sub.reminder_days is not None else user_reminder_days
        else:
            effective_days = user_reminder_days
        window_end = today + timedelta(days=effective_days)
        if sub.next_billing_date <= window_end:
            due_soon_subs.append(sub)

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
        monthly_prices=[
            SubscriptionBrief(name=n, amount=round(p, 2)) for n, p in sorted_prices
        ],
    )


@router.get("/forecast", response_model=SubscriptionForecast)
def get_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Project actual billing cashflow for the next 12 calendar months.

    Must be declared before /{subscription_id} so "forecast" is not captured as an id.
    """
    base = current_user.base_currency
    subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
            Subscription.next_billing_date.isnot(None),
        )
        .all()
    )

    rate_cache: dict[str, float] = {}

    def _rate_for(currency: str) -> float:
        if currency not in rate_cache:
            rate_cache[currency] = get_rate(db, currency, base)
        return rate_cache[currency]

    monthly, next_30 = build_forecast(subscriptions, _rate_for)

    return SubscriptionForecast(
        base_currency=base,
        months=[
            MonthlyForecast(
                year_month=bucket.year_month,
                total=bucket.total,
                items=[
                    ForecastChargeItem(
                        subscription_id=item.subscription_id,
                        name=item.name,
                        billing_date=item.billing_date,
                        amount=item.amount,
                    )
                    for item in bucket.items
                ],
            )
            for bucket in monthly
        ],
        next_30_days_total=next_30,
    )


@router.post("/upload-logo")
def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPG, PNG, GIF",
        )
    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 2MB limit",
        )

    os.makedirs(LOGOS_DIR, exist_ok=True)

    ext = EXT_MAP.get(file.content_type, "png") if file.content_type else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(LOGOS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"logo_url": f"/static/logos/{filename}"}


@router.get("/search-logo")
def search_logo(
    query: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    if not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must not be empty",
        )
    results = logo_search.search_logos(f"{query.strip()} logo")
    return {"results": results}


@router.post("/cache-logo")
def cache_logo(
    payload: CacheLogoRequest,
    current_user: User = Depends(get_current_user),
):
    image_url = str(payload.image_url)
    try:
        resp = ssrf.safe_get(image_url, allowlist=None, follow_redirects=True)
    except ssrf.SsrfBlockedError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image URL host is not allowed",
        )
    content_type = resp.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPG, PNG, GIF",
        )
    if len(resp.content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 2MB limit",
        )
    os.makedirs(LOGOS_DIR, exist_ok=True)
    ext = EXT_MAP.get(content_type, "png")
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(LOGOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(resp.content)
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
    subscription = (
        db.query(Subscription)
        .options(joinedload(Subscription.category), joinedload(Subscription.payment_method))
        .filter(Subscription.id == subscription_id)
        .first()
    )
    _check_ownership(subscription, current_user.id)
    subscription.acknowledged_billing_date = subscription.next_billing_date
    db.commit()
    db.refresh(subscription)
    base = current_user.base_currency
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = _converted_price(subscription.price, rate)  # type: ignore[attr-defined]
    return subscription


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = (
        db.query(Subscription)
        .options(joinedload(Subscription.category), joinedload(Subscription.payment_method))
        .filter(Subscription.id == subscription_id)
        .first()
    )
    _check_ownership(subscription, current_user.id)
    base = current_user.base_currency
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = _converted_price(subscription.price, rate)  # type: ignore[attr-defined]
    return subscription


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = (
        db.query(Subscription)
        .options(joinedload(Subscription.category), joinedload(Subscription.payment_method))
        .filter(Subscription.id == subscription_id)
        .first()
    )
    _check_ownership(subscription, current_user.id)

    update_data = data.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        _validate_category_ownership(db, update_data["category_id"], current_user.id)
    if "payment_method_id" in update_data:
        _validate_payment_method_ownership(db, update_data["payment_method_id"], current_user.id)
    # When reminder_mode is explicitly set to default, force reminder_days to None
    # so stale custom values are cleared even if the client didn't send reminder_days.
    if update_data.get("reminder_mode") == ReminderMode.default:
        update_data["reminder_days"] = None
    for field, value in update_data.items():
        setattr(subscription, field, value)

    cycle_changed = "cycle_count" in update_data or "cycle_unit" in update_data
    start_changed = "start_date" in update_data
    if cycle_changed or start_changed:
        next_date = _compute_next_billing_date(
            subscription.start_date, subscription.cycle_count, subscription.cycle_unit
        )
        subscription.next_billing_date = _align_to_future(
            next_date, subscription.cycle_count, subscription.cycle_unit
        )

    db.commit()
    db.refresh(subscription)
    base = current_user.base_currency
    rate = get_rate(db, subscription.currency, base)
    subscription.converted_price = _converted_price(subscription.price, rate)  # type: ignore[attr-defined]
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
