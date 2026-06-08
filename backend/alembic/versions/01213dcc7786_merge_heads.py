"""merge heads

Revision ID: 01213dcc7786
Revises: 5e32eb486ac7, a1b2c3d4e5f6
Create Date: 2026-06-08 23:46:04.286996
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '01213dcc7786'
down_revision: Union[str, None] = ('5e32eb486ac7', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
