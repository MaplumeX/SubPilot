"""add subscription reminder fields

Revision ID: f5edd13044d3
Revises: b8f3a1c2d4e7
Create Date: 2026-07-05 12:00:00.000000

Adds per-subscription reminder configuration:
- reminder_enabled (NOT NULL, default 1) — whether this sub participates in scans
- reminder_mode (NOT NULL enum default/custom, default 'default') — follow global
  reminder_days or use this sub's reminder_days
- reminder_days (nullable int) — only used when reminder_mode == 'custom'

Existing rows get reminder_enabled=1, reminder_mode='default', reminder_days=NULL,
which preserves current behavior (follow global User.reminder_days).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f5edd13044d3'
down_revision: Union[str, None] = 'b8f3a1c2d4e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'subscriptions',
        sa.Column('reminder_enabled', sa.Boolean(), server_default=sa.text('1'), nullable=False),
    )
    op.add_column(
        'subscriptions',
        sa.Column(
            'reminder_mode',
            sa.Enum('default', 'custom', name='remindermode'),
            server_default=sa.text("'default'"),
            nullable=False,
        ),
    )
    op.add_column(
        'subscriptions',
        sa.Column('reminder_days', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('subscriptions', 'reminder_days')
    op.drop_column('subscriptions', 'reminder_mode')
    op.drop_column('subscriptions', 'reminder_enabled')