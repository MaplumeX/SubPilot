from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.currencies import SUPPORTED_CURRENCIES
from app.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    Token,
    UserCreate,
    UserResponse,
)
from app.schemas.notification import (
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
    TestChannelRequest,
)
from app.services.notifications.channels import build_channel_for_test

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "refresh"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email=data.email,
        hashed_password=pwd_context.hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(
        access_token=_create_access_token(user.id),
        refresh_token=_create_refresh_token(user.id),
    )


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return Token(
        access_token=_create_access_token(user.id),
        refresh_token=_create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=Token)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    from jose import JWTError

    try:
        payload = jwt.decode(
            data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise JWTError()
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise JWTError()
        user_id = int(user_id_str)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return Token(
        access_token=_create_access_token(user.id),
        refresh_token=_create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/locale", response_model=UserResponse)
def update_locale(locale: str = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if locale not in ("en", "zh-CN"):
        raise HTTPException(status_code=400, detail="Unsupported locale")
    current_user.locale = locale
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/base-currency", response_model=UserResponse)
def update_base_currency(currency: str = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency. Valid: {', '.join(sorted(SUPPORTED_CURRENCIES))}")
    current_user.base_currency = currency
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/notifications", response_model=NotificationSettingsResponse)
def get_notification_settings(current_user: User = Depends(get_current_user)):
    return current_user


def _validate_channel_credentials(user: User) -> None:
    """Reject saving an enabled channel without complete credentials."""
    if user.reminder_email_enabled:
        if not (user.smtp_host and user.smtp_port and user.smtp_user and user.smtp_password):
            raise HTTPException(
                status_code=422,
                detail="Email channel enabled but SMTP credentials incomplete",
            )
    if user.reminder_telegram_enabled:
        if not (user.telegram_bot_token and user.telegram_chat_id):
            raise HTTPException(
                status_code=422,
                detail="Telegram channel enabled but bot token / chat id incomplete",
            )


@router.put("/me/notifications", response_model=NotificationSettingsResponse)
def update_notification_settings(
    data: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    _validate_channel_credentials(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/notifications/test")
def test_notification_channel(
    data: TestChannelRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        channel = build_channel_for_test(current_user, data.channel)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    try:
        channel.test()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Test message failed: {exc}")
    return {"ok": True}
