"""add reminder_time timezone last_reminder_local_date

Revision ID: a7c4e2f9b1d0
Revises: f5edd13044d3
Create Date: 2026-07-09 22:30:00.000000

Adds user-level preferred daily reminder send time and timezone:
- reminder_time (NOT NULL, default '09:00') — local HH:MM
- timezone (NOT NULL, default 'Asia/Shanghai') — IANA id
- last_reminder_local_date (nullable Date) — internal once-per-local-day marker
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7c4e2f9b1d0"
down_revision: Union[str, None] = "f5edd13044d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "reminder_time",
            sa.String(length=5),
            server_default=sa.text("'09:00'"),
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "timezone",
            sa.String(length=64),
            server_default=sa.text("'Asia/Shanghai'"),
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("last_reminder_local_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "last_reminder_local_date")
    op.drop_column("users", "timezone")
    op.drop_column("users", "reminder_time")
