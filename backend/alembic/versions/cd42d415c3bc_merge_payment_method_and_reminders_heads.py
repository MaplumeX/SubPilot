"""merge payment_method and reminders heads

Revision ID: cd42d415c3bc
Revises: f7a3c2d1e9b8, 45f6eb360605
Create Date: 2026-06-17 18:56:02.886922
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cd42d415c3bc'
down_revision: Union[str, None] = ('f7a3c2d1e9b8', '45f6eb360605')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
