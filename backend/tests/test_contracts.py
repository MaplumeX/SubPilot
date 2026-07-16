import os
import unittest

from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from pydantic import ValidationError

os.environ["SECRET_KEY"] = "test-secret-key-with-at-least-32-characters"

from app.config import Settings
from app.models.subscription import CycleUnit
from app.routers.subscriptions import (
    ALLOWED_CONTENT_TYPES,
    _align_to_future,
    _compute_next_billing_date,
    _converted_price,
    _normalize_to_monthly,
)
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from app.services.renewal import advance_next_billing_date


class SecurityAndSubscriptionContractTests(unittest.TestCase):
    def test_default_secret_key_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            Settings(SECRET_KEY="dev-secret-change-in-production")

    def test_svg_is_not_an_allowed_uploaded_logo_type(self) -> None:
        self.assertNotIn("image/svg+xml", ALLOWED_CONTENT_TYPES)

    def test_create_rejects_unsupported_currency(self) -> None:
        with self.assertRaises(ValidationError):
            SubscriptionCreate(
                name="Example",
                price=1,
                currency="ZZZ",
                cycle_count=1,
                cycle_unit=CycleUnit.month,
                payment_method_id=1,
                start_date="2026-01-01",
            )

    def test_create_accepts_extended_currency(self) -> None:
        payload = SubscriptionCreate(
            name="Example",
            price=1,
            currency="HKD",
            cycle_count=1,
            cycle_unit=CycleUnit.month,
            payment_method_id=1,
            start_date="2026-01-01",
        )
        self.assertEqual(payload.currency, "HKD")

    def test_update_accepts_extended_currency(self) -> None:
        payload = SubscriptionUpdate(currency="SGD")
        self.assertEqual(payload.currency, "SGD")

    def test_update_rejects_unsupported_currency(self) -> None:
        with self.assertRaises(ValidationError):
            SubscriptionUpdate(currency="ZZZ")

    def test_update_rejects_null_payment_method(self) -> None:
        with self.assertRaises(ValidationError):
            SubscriptionUpdate(payment_method_id=None)

    def test_update_allows_omitting_payment_method(self) -> None:
        self.assertEqual(SubscriptionUpdate().model_dump(exclude_unset=True), {})


class NextBillingDateAlignmentTests(unittest.TestCase):
    """Tests for _align_to_future — the future-alignment loop on create/update."""

    def test_past_start_date_2_years_ago_monthly_advances_to_future(self) -> None:
        today = date(2025, 7, 16)
        start = date(2023, 7, 16)  # 2 years ago, cycle 1 month
        next_date = _compute_next_billing_date(start, 1, CycleUnit.month)
        aligned = _align_to_future(next_date, 1, CycleUnit.month, today=today)
        self.assertGreater(aligned, today)
        # Day-of-month alignment preserved (month cycle advances whole months)
        self.assertEqual(aligned.day, start.day)

    def test_future_start_date_no_over_advancement(self) -> None:
        today = date(2025, 7, 16)
        start = date(2026, 1, 1)  # in the future
        next_date = _compute_next_billing_date(start, 1, CycleUnit.month)
        aligned = _align_to_future(next_date, 1, CycleUnit.month, today=today)
        # Should be start_date + one cycle, unchanged
        self.assertEqual(aligned, start + relativedelta(months=1))

    def test_auto_renew_false_still_aligned(self) -> None:
        # _align_to_future is called regardless of auto_renew; it only depends
        # on the computed next_billing_date being in the past.
        today = date(2025, 7, 16)
        start = date(2024, 1, 15)  # ~18 months ago, cycle 1 month
        next_date = _compute_next_billing_date(start, 1, CycleUnit.month)
        aligned = _align_to_future(next_date, 1, CycleUnit.month, today=today)
        self.assertGreater(aligned, today)
        self.assertEqual(aligned.day, 15)

    def test_yearly_cycle_past_start_advances_to_future(self) -> None:
        today = date(2025, 7, 16)
        start = date(2020, 7, 16)  # 5 years ago, cycle 1 year
        next_date = _compute_next_billing_date(start, 1, CycleUnit.year)
        aligned = _align_to_future(next_date, 1, CycleUnit.year, today=today)
        self.assertGreater(aligned, today)

    def test_budget_exhausted_leaves_date_as_is(self) -> None:
        today = date(2025, 7, 16)
        start = date(2000, 1, 1)  # 25 years ago, cycle 1 day
        next_date = _compute_next_billing_date(start, 1, CycleUnit.day)
        # The default _MAX_CATCH_UP=2000 won't cover ~9000 days, so the result
        # should still be in the past (left as-is after budget exhausted).
        aligned = _align_to_future(next_date, 1, CycleUnit.day, today=today)
        self.assertLessEqual(aligned, today)

    def test_uses_advance_next_billing_date_not_reimplemented(self) -> None:
        # Contract: aligned result must match manual repeated calls to
        # advance_next_billing_date (single-sourced cycle math).
        today = date(2025, 7, 16)
        start = date(2024, 12, 10)
        next_date = _compute_next_billing_date(start, 1, CycleUnit.month)
        aligned = _align_to_future(next_date, 1, CycleUnit.month, today=today)
        manual = next_date
        while manual <= today:
            manual = advance_next_billing_date(manual, 1, CycleUnit.month)
        self.assertEqual(aligned, manual)


class NormalizeToMonthlyTests(unittest.TestCase):
    """Tests for _normalize_to_monthly — cycle_count is a span, not a frequency."""

    def test_quarterly_preset_correct(self) -> None:
        # price=100, every 3 months → monthly = 100/3
        self.assertAlmostEqual(_normalize_to_monthly(100, 3, CycleUnit.month), 100 / 3)

    def test_monthly_preset_regression(self) -> None:
        self.assertAlmostEqual(_normalize_to_monthly(100, 1, CycleUnit.month), 100.0)

    def test_yearly_preset_regression(self) -> None:
        self.assertAlmostEqual(_normalize_to_monthly(1200, 1, CycleUnit.year), 100.0)

    def test_every_2_weeks_correct(self) -> None:
        self.assertAlmostEqual(_normalize_to_monthly(100, 2, CycleUnit.week), 100 / 2 * 52 / 12)

    def test_every_6_months_correct(self) -> None:
        self.assertAlmostEqual(_normalize_to_monthly(100, 6, CycleUnit.month), 100 / 6)

    def test_every_2_days_correct(self) -> None:
        self.assertAlmostEqual(_normalize_to_monthly(100, 2, CycleUnit.day), 100 / 2 * 365 / 12)


class ConvertedPriceTests(unittest.TestCase):
    """Tests for _converted_price — single-cycle, not monthly-normalized."""

    def test_yearly_120_usd_to_cny_is_864(self) -> None:
        # Annual $120 at rate 7.2 → 864.0 (not 72.0 which would be monthly)
        self.assertEqual(_converted_price(120, 7.2), 864.0)

    def test_monthly_10_usd_to_cny_is_72(self) -> None:
        self.assertEqual(_converted_price(10, 7.2), 72.0)


if __name__ == "__main__":
    unittest.main()
