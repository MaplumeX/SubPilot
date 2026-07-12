import logging
from datetime import date

import httpx
from sqlalchemy.orm import Session

from app.currencies import SUPPORTED_CURRENCIES
from app.models.exchange_rate import ExchangeRate

FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest"

logger = logging.getLogger(__name__)


def fetch_exchange_rates(db: Session) -> int:
    try:
        resp = httpx.get(
            FRANKFURTER_URL,
            params={"from": "USD", "to": ",".join(sorted(SUPPORTED_CURRENCIES - {"USD"}))},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, KeyError) as exc:
        logger.warning("Failed to fetch exchange rates: %s", exc)
        return 0

    rates_from_usd: dict[str, float] = data.get("rates", {})
    rates_from_usd["USD"] = 1.0
    rate_date = date.fromisoformat(data["date"])

    pairs: list[tuple[str, str, float]] = []
    currencies = sorted(rates_from_usd.keys())
    for base in currencies:
        for target in currencies:
            if base == target:
                continue
            rate = rates_from_usd[target] / rates_from_usd[base]
            pairs.append((base, target, rate))

    upserted = 0
    for base, target, rate in pairs:
        existing = (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.base_currency == base,
                ExchangeRate.target_currency == target,
                ExchangeRate.date == rate_date,
            )
            .first()
        )
        if existing:
            existing.rate = rate
        else:
            db.add(ExchangeRate(
                base_currency=base,
                target_currency=target,
                rate=rate,
                date=rate_date,
            ))
        upserted += 1

    db.commit()
    logger.info("Upserted %d exchange rate pairs for %s", upserted, rate_date)
    return upserted


def get_rate(db: Session, base: str, target: str) -> float:
    if base == target:
        return 1.0

    row = (
        db.query(ExchangeRate)
        .filter(ExchangeRate.base_currency == base, ExchangeRate.target_currency == target)
        .order_by(ExchangeRate.date.desc())
        .first()
    )
    if row:
        return row.rate

    logger.warning("No exchange rate for %s->%s, using 1.0", base, target)
    return 1.0
