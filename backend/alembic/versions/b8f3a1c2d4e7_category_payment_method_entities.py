"""category and payment_method as managed entities

Revision ID: b8f3a1c2d4e7
Revises: cd42d415c3bc
Create Date: 2026-06-27 09:00:00.000000

Dev-stage assumption: existing subscription rows are expected to have non-empty
`payment_method` values. The new `payment_method_id` column is NOT NULL, so any
rows with an empty `payment_method` ('' / None) cannot be backfilled and will
cause the `alter_column ... nullable=False` step to fail loudly. The operator
must clean up such dirty rows before running this migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8f3a1c2d4e7'
down_revision: Union[str, None] = 'cd42d415c3bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'name', name='uq_categories_user_name'),
    )

    # 2. Create payment_methods table
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'name', name='uq_payment_methods_user_name'),
    )

    # 3. Add nullable FK columns to subscriptions
    op.add_column('subscriptions', sa.Column('category_id', sa.Integer(), nullable=True))
    op.add_column('subscriptions', sa.Column('payment_method_id', sa.Integer(), nullable=True))

    # 5. Backfill categories (per-user dedup)
    op.execute(
        "INSERT INTO categories (user_id, name, created_at) "
        "SELECT DISTINCT user_id, category, CURRENT_TIMESTAMP FROM subscriptions "
        "WHERE category IS NOT NULL AND category <> ''"
    )

    # 6. Backfill subscriptions.category_id
    op.execute(
        "UPDATE subscriptions SET category_id = ("
        "SELECT id FROM categories c WHERE c.user_id = subscriptions.user_id AND c.name = subscriptions.category"
        ") WHERE category IS NOT NULL AND category <> ''"
    )

    # 7. Backfill payment_methods + subscriptions.payment_method_id
    op.execute(
        "INSERT INTO payment_methods (user_id, name, created_at) "
        "SELECT DISTINCT user_id, payment_method, CURRENT_TIMESTAMP FROM subscriptions "
        "WHERE payment_method IS NOT NULL AND payment_method <> ''"
    )
    op.execute(
        "UPDATE subscriptions SET payment_method_id = ("
        "SELECT id FROM payment_methods pm WHERE pm.user_id = subscriptions.user_id AND pm.name = subscriptions.payment_method"
        ") WHERE payment_method IS NOT NULL AND payment_method <> ''"
    )

    # 8. Add FK constraints (ondelete RESTRICT) — batch mode for SQLite
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.create_foreign_key(
            'fk_subscriptions_category_id_categories',
            'categories',
            ['category_id'],
            ['id'],
            ondelete='RESTRICT',
        )
        batch_op.create_foreign_key(
            'fk_subscriptions_payment_method_id_payment_methods',
            'payment_methods',
            ['payment_method_id'],
            ['id'],
            ondelete='RESTRICT',
        )

    # 9. Make payment_method_id NOT NULL (fails loudly on empty rows)
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.alter_column('payment_method_id', existing_type=sa.Integer(), nullable=False)

    # 10-11. Drop old string columns
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.drop_column('category')
        batch_op.drop_column('payment_method')


def downgrade() -> None:
    # Best-effort reverse for dev stage.
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.add_column(sa.Column('category', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('payment_method', sa.String(length=100), nullable=False, server_default=''))

    # Reconstitute string values from the joined entities where possible
    op.execute(
        "UPDATE subscriptions SET category = ("
        "SELECT name FROM categories WHERE categories.id = subscriptions.category_id"
        ") WHERE category_id IS NOT NULL"
    )
    op.execute(
        "UPDATE subscriptions SET payment_method = ("
        "SELECT name FROM payment_methods WHERE payment_methods.id = subscriptions.payment_method_id"
        ") WHERE payment_method_id IS NOT NULL"
    )

    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.drop_constraint('fk_subscriptions_payment_method_id_payment_methods', type_='foreignkey')
        batch_op.drop_constraint('fk_subscriptions_category_id_categories', type_='foreignkey')
        batch_op.drop_column('payment_method_id')
        batch_op.drop_column('category_id')

    op.drop_table('payment_methods')
    op.drop_table('categories')
