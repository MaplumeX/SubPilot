from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.payment_method import PaymentMethod
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentMethodUpdate,
)

router = APIRouter(prefix="/api/v1/payment-methods", tags=["payment-methods"])


@router.post("", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
def create_payment_method(
    data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment_method = PaymentMethod(user_id=current_user.id, name=data.name)
    db.add(payment_method)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment method already exists",
        )
    db.refresh(payment_method)
    return payment_method


@router.get("", response_model=list[PaymentMethodResponse])
def list_payment_methods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(PaymentMethod)
        .filter(PaymentMethod.user_id == current_user.id)
        .order_by(PaymentMethod.name)
        .all()
    )


@router.patch("/{payment_method_id}", response_model=PaymentMethodResponse)
def rename_payment_method(
    payment_method_id: int,
    data: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment_method = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == current_user.id,
        )
        .first()
    )
    if payment_method is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )
    payment_method.name = data.name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment method already exists",
        )
    db.refresh(payment_method)
    return payment_method


@router.delete("/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_method(
    payment_method_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment_method = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == current_user.id,
        )
        .first()
    )
    if payment_method is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )
    count = (
        db.query(Subscription)
        .filter(Subscription.payment_method_id == payment_method_id)
        .count()
    )
    if count > 0:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Payment method is in use", "count": count},
        )
    db.delete(payment_method)
    db.commit()
