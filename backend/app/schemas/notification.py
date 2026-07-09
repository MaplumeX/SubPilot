import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator

_REMINDER_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class NotificationSettingsResponse(BaseModel):
    reminders_enabled: bool
    reminder_days: int
    reminder_time: str
    timezone: str
    reminder_email_enabled: bool
    reminder_telegram_enabled: bool
    telegram_chat_id: str | None = None
    telegram_bot_token: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None

    model_config = {"from_attributes": True}


class NotificationSettingsUpdate(BaseModel):
    reminders_enabled: bool | None = None
    reminder_days: int | None = Field(default=None, ge=1, le=90)
    reminder_time: str | None = None
    timezone: str | None = None
    reminder_email_enabled: bool | None = None
    reminder_telegram_enabled: bool | None = None
    telegram_chat_id: str | None = None
    telegram_bot_token: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = Field(default=None, ge=1, le=65535)
    smtp_user: str | None = None
    smtp_password: str | None = None

    model_config = {"extra": "forbid"}

    @field_validator(
        "telegram_chat_id", "telegram_bot_token",
        "smtp_host", "smtp_user", "smtp_password",
    )
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        if v is not None and v.strip() == "":
            return None
        return v

    @field_validator("reminder_time")
    @classmethod
    def _valid_reminder_time(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not _REMINDER_TIME_RE.match(v):
            raise ValueError("reminder_time must be HH:MM (24h)")
        return v

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, KeyError, ValueError) as exc:
            raise ValueError(f"unknown IANA timezone: {v}") from exc
        return v


class TestChannelRequest(BaseModel):
    channel: str

    @field_validator("channel")
    @classmethod
    def _valid_channel(cls, v: str) -> str:
        if v not in ("email", "telegram"):
            raise ValueError("channel must be 'email' or 'telegram'")
        return v

    model_config = {"extra": "forbid"}
