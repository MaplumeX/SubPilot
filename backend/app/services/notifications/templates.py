from __future__ import annotations

from app.models.subscription import Subscription


_TEMPLATES: dict[str, dict[str, str]] = {
    "en": {
        "subject": "[SubPilot] Subscription due in {days} day(s): {name}",
        "body": (
            "Hello,\n\n"
            "Your subscription \"{name}\" is due on {date} ({days} day(s) remaining).\n"
            "Amount: {currency} {price}\n\n"
            "If you have already renewed, mark it as acknowledged in SubPilot to stop reminders.\n"
        ),
        "trial_body": (
            "Hello,\n\n"
            "Your trial subscription \"{name}\" ends on {date} ({days} day(s) remaining).\n"
            "It will convert to a paid plan unless cancelled.\n\n"
            "If you have already handled it, mark it as acknowledged in SubPilot to stop reminders.\n"
        ),
    },
    "zh-CN": {
        "subject": "【SubPilot】订阅即将到期（{days} 天）：{name}",
        "body": (
            "您好，\n\n"
            "您的订阅「{name}」将于 {date} 到期（剩余 {days} 天）。\n"
            "金额：{currency} {price}\n\n"
            "如已续费，请在 SubPilot 中标记为已确认，即可停止提醒。\n"
        ),
        "trial_body": (
            "您好，\n\n"
            "您的试用订阅「{name}」将于 {date} 到期（剩余 {days} 天）。\n"
            "如不取消将转为付费订阅。\n\n"
            "如已处理，请在 SubPilot 中标记为已确认，即可停止提醒。\n"
        ),
    },
}


def render(locale: str, sub: Subscription, days: int) -> tuple[str, str]:
    """Render (subject, body) for a due subscription based on locale.

    Unknown locales fall back to English.
    """
    tpl = _TEMPLATES.get(locale, _TEMPLATES["en"])
    body_key = "trial_body" if sub.status is not None and sub.status.value == "trial" else "body"
    fmt = {
        "name": sub.name,
        "date": sub.next_billing_date.isoformat() if sub.next_billing_date else "",
        "days": days,
        "currency": sub.currency,
        "price": f"{sub.price:.2f}",
    }
    return tpl["subject"].format(**fmt), tpl[body_key].format(**fmt)
