"""replace billing_cycle with cycle_count and cycle_unit

Revision ID: a1b2c3d4e5f6
Revises: 3af90249113f
Create Date: 2026-06-08 22:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3af90249113f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create new cycleunit enum type
    cycleunit = sa.Enum('day', 'week', 'month', 'year', name='cycleunit')
    cycleunit.create(op.get_bind(), checkfirst=True)

    # 2. Add new columns
    op.add_column('subscriptions', sa.Column('cycle_count', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('subscriptions', sa.Column('cycle_unit', cycleunit, nullable=False, server_default='month'))

    # 3. Migrate data from billing_cycle to cycle_count + cycle_unit
    op.execute("UPDATE subscriptions SET cycle_count = 1, cycle_unit = 'week' WHERE billing_cycle = 'weekly'")
    op.execute("UPDATE subscriptions SET cycle_count = 1, cycle_unit = 'month' WHERE billing_cycle = 'monthly'")
    op.execute("UPDATE subscriptions SET cycle_count = 3, cycle_unit = 'month' WHERE billing_cycle = 'quarterly'")
    op.execute("UPDATE subscriptions SET cycle_count = 1, cycle_unit = 'year' WHERE billing_cycle = 'yearly'")

    # 4. Drop old billing_cycle column
    op.drop_column('subscriptions', 'billing_cycle')

    # 5. Drop old billingcycle enum type
    billingcycle = sa.Enum(name='billingcycle')
    billingcycle.drop(op.get_bind(), checkfirst=True)

    # 6. Add CHECK constraint for cycle_count >= 1
    # Note: SQLite < 3.25 does not support ALTER TABLE ADD CONSTRAINT.
    # Use batch_alter_table for cross-dialect compatibility.
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.create_check_constraint('ck_subscriptions_cycle_count_positive', sa.column('cycle_count') >= 1)


def downgrade() -> None:
    # 1. Recreate old billingcycle enum type
    billingcycle = sa.Enum('weekly', 'monthly', 'quarterly', 'yearly', name='billingcycle')
    billingcycle.create(op.get_bind(), checkfirst=True)

    # 2. Add billing_cycle column back
    op.add_column('subscriptions', sa.Column('billing_cycle', billingcycle, nullable=False, server_default='monthly'))

    # 3. Migrate data back from cycle_count + cycle_unit to billing_cycle
    op.execute("UPDATE subscriptions SET billing_cycle = 'weekly' WHERE cycle_count = 1 AND cycle_unit = 'week'")
    op.execute("UPDATE subscriptions SET billing_cycle = 'monthly' WHERE cycle_count = 1 AND cycle_unit = 'month'")
    op.execute("UPDATE subscriptions SET billing_cycle = 'quarterly' WHERE cycle_count = 3 AND cycle_unit = 'month'")
    op.execute("UPDATE subscriptions SET billing_cycle = 'yearly' WHERE cycle_count = 1 AND cycle_unit = 'year'")
    # For custom cycles that don't map back, default to monthly
    op.execute("UPDATE subscriptions SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL OR billing_cycle NOT IN ('weekly', 'monthly', 'quarterly', 'yearly')")

    # 4. Drop CHECK constraint
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.drop_constraint('ck_subscriptions_cycle_count_positive', type_='check')

    # 5. Drop new columns
    op.drop_column('subscriptions', 'cycle_unit')
    op.drop_column('subscriptions', 'cycle_count')

    # 6. Drop new cycleunit enum type
    cycleunit = sa.Enum(name='cycleunit')
    cycleunit.drop(op.get_bind(), checkfirst=True)
