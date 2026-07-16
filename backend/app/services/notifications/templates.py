from __future__ import annotations

from app.models.subscription import Subscription


_TEMPLATES: dict[str, dict[str, str]] = {
    "en": {
        "subject_multi": "[SubPilot] You have {count} subscription(s) due soon",
        "subject_single": "[SubPilot] Subscription due in {days} day(s): {name}",
        "body_header": (
            "Hello,\n\n"
            "The following {count} subscription(s) are due soon. "
            "Please confirm whether to renew or cancel:\n"
        ),
        "item_normal": (
            "{idx}. {name}\n"
            "   Due: {date} ({days} day(s) remaining)\n"
            "   Amount: {currency} {price}\n"
        ),
        "item_trial": (
            "{idx}. {name} (trial)\n"
            "   Due: {date} ({days} day(s) remaining)\n"
            "   It will convert to a paid plan unless cancelled.\n"
        ),
        "body_footer": "\nIf you have already handled them, mark them as acknowledged in SubPilot to stop reminders.\n",
    },
    "zh-CN": {
        "subject_multi": "【SubPilot】您有 {count} 笔订阅即将到期",
        "subject_single": "【SubPilot】订阅即将到期（{days} 天）：{name}",
        "body_header": "您好，\n\n以下 {count} 笔订阅即将到期，请确认是否需要续费或取消：\n",
        "item_normal": (
            "{idx}. {name}\n"
            "   到期日：{date}（剩余 {days} 天）\n"
            "   金额：{currency} {price}\n"
        ),
        "item_trial": (
            "{idx}. {name}（试用）\n"
            "   到期日：{date}（剩余 {days} 天）\n"
            "   如不取消将转为付费订阅。\n"
        ),
        "body_footer": "\n如已处理，请在 SubPilot 中标记为已确认，即可停止提醒。\n",
    },
}


def render(locale: str, items: list[tuple[Subscription, int]]) -> tuple[str, str]:
    """Render (subject, body) for a list of due subscriptions.

    items: list of (subscription, days_remaining), pre-sorted by days ascending.
    Unknown locales fall back to English.
    """
    tpl = _TEMPLATES.get(locale, _TEMPLATES["en"])

    count = len(items)
    if count == 1:
        sub, days = items[0]
        subject = tpl["subject_single"].format(days=days, name=sub.name)
    else:
        subject = tpl["subject_multi"].format(count=count)

    body = tpl["body_header"].format(count=count)
    for idx, (sub, days) in enumerate(items, start=1):
        is_trial = sub.status is not None and sub.status.value == "trial"
        item_tpl = tpl["item_trial"] if is_trial else tpl["item_normal"]
        body += item_tpl.format(
            idx=idx,
            name=sub.name,
            date=sub.next_billing_date.isoformat() if sub.next_billing_date else "",
            days=days,
            currency=sub.currency,
            price=f"{sub.price:.2f}",
        )
    body += tpl["body_footer"]

    return subject, body
