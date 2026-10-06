"""Add draft_plans.orders_closed_at for the booklet Close-orders step.

Additive only. Safe when create_all() already added the column.

Revision ID: 0006_orders_closed
Revises: 0005_stop_arrivals
Create Date: 2026-10-06 00:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0006_orders_closed"
down_revision: Union[str, None] = "0005_stop_arrivals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "draft_plans" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("draft_plans")}
    if "orders_closed_at" in cols:
        return
    op.add_column(
        "draft_plans",
        sa.Column("orders_closed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "draft_plans" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("draft_plans")}
    if "orders_closed_at" not in cols:
        return
    op.drop_column("draft_plans", "orders_closed_at")
