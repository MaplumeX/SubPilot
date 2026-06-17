from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.models.user import User

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"
TELEGRAM_TIMEOUT = 10.0
SMTP_TIMEOUT = 15.0


class Channel:
    """Minimal notification channel protocol."""

    name: str

    def send(self, *, subject: str, body: str) -> None:
        raise NotImplementedError

    def test(self) -> None:
        """Send a test message. Raise on failure."""
        raise NotImplementedError


class EmailChannel(Channel):
    name = "email"

    def __init__(self, user: User) -> None:
        if not user.smtp_host or not user.smtp_port or not user.smtp_user or not user.smtp_password:
            raise ValueError("SMTP credentials incomplete")
        if not user.email:
            raise ValueError("User has no email address")
        self.user = user

    def _connect(self) -> smtplib.SMTP:
        port = self.user.smtp_port
        # Port 465 uses implicit TLS; everything else uses STARTTLS.
        if port == 465:
            client: smtplib.SMTP = smtplib.SMTP_SSL(
                self.user.smtp_host, port, timeout=SMTP_TIMEOUT
            )
        else:
            client = smtplib.SMTP(self.user.smtp_host, port, timeout=SMTP_TIMEOUT)
            client.starttls()
        client.login(self.user.smtp_user, self.user.smtp_password)
        return client

    def _build_message(self, subject: str, body: str) -> EmailMessage:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.user.smtp_user
        msg["To"] = self.user.email
        msg.set_content(body)
        return msg

    def send(self, *, subject: str, body: str) -> None:
        with self._connect() as client:
            client.send_message(self._build_message(subject, body))

    def test(self) -> None:
        self.send(subject="[SubPilot] Test message", body="This is a test message from SubPilot reminders.")


class TelegramChannel(Channel):
    name = "telegram"

    def __init__(self, user: User) -> None:
        if not user.telegram_bot_token or not user.telegram_chat_id:
            raise ValueError("Telegram credentials incomplete")
        self.token = user.telegram_bot_token
        self.chat_id = user.telegram_chat_id

    def _send_text(self, text: str) -> None:
        url = f"{TELEGRAM_API_BASE}/bot{self.token}/sendMessage"
        with httpx.Client(timeout=TELEGRAM_TIMEOUT) as client:
            resp = client.post(url, json={"chat_id": self.chat_id, "text": text})
            resp.raise_for_status()

    def send(self, *, subject: str, body: str) -> None:
        self._send_text(f"{subject}\n\n{body}")

    def test(self) -> None:
        self._send_text("✅ SubPilot reminder test message.")


def build_channels(user: User) -> list[Channel]:
    """Return the list of channels the user has enabled with complete credentials."""
    channels: list[Channel] = []
    if user.reminder_email_enabled:
        try:
            channels.append(EmailChannel(user))
        except ValueError:
            logger.warning("User %s has email enabled but incomplete SMTP credentials", user.id)
    if user.reminder_telegram_enabled:
        try:
            channels.append(TelegramChannel(user))
        except ValueError:
            logger.warning("User %s has telegram enabled but incomplete credentials", user.id)
    return channels


def build_channel_for_test(user: User, channel: str) -> Channel:
    """Build a single channel by name for the /test endpoint.

    Raises ValueError if the channel is unknown or credentials are incomplete.
    """
    if channel == "email":
        return EmailChannel(user)
    if channel == "telegram":
        return TelegramChannel(user)
    raise ValueError(f"Unknown channel: {channel}")
