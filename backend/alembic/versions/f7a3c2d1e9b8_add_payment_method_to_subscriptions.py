"""add payment_method to subscriptions

Revision ID: f7a3c2d1e9b8
Revises: 69eab0587ff4
Create Date: 2026-06-17 18:05:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7a3c2d1e9b8'
down_revision: Union[str, None] = '69eab0587ff4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'subscriptions',
        sa.Column('payment_method', sa.String(100), server_default='', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('subscriptions', 'payment_method')
