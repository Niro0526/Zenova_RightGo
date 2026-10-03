"""Add the supplied dataset delivery identifier to orders."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_dataset_order_identifiers"
down_revision: Union[str, None] = "0002_driver_delivery_completion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("delivery_id", sa.String(length=64), nullable=True))
    op.create_index(op.f("ix_orders_delivery_id"), "orders", ["delivery_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_orders_delivery_id"), table_name="orders")
    op.drop_column("orders", "delivery_id")