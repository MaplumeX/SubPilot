import os
import unittest

from pydantic import ValidationError

os.environ["SECRET_KEY"] = "test-secret-key-with-at-least-32-characters"

from app.config import Settings
from app.models.subscription import CycleUnit
from app.routers.subscriptions import ALLOWED_CONTENT_TYPES
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate


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

    def test_update_rejects_null_payment_method(self) -> None:
        with self.assertRaises(ValidationError):
            SubscriptionUpdate(payment_method_id=None)

    def test_update_allows_omitting_payment_method(self) -> None:
        self.assertEqual(SubscriptionUpdate().model_dump(exclude_unset=True), {})


if __name__ == "__main__":
    unittest.main()
