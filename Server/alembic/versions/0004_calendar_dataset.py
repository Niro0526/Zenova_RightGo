"""Store the supplied operating calendar dataset."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_calendar_dataset"
down_revision: Union[str, None] = "0003_dataset_order_identifiers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar",
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("dow", sa.Integer(), nullable=False),
        sa.Column("dow_name", sa.String(length=16), nullable=False),
        sa.Column("is_weekend", sa.Boolean(), nullable=False),
        sa.Column("iso_year", sa.Integer(), nullable=False),
        sa.Column("iso_week", sa.Integer(), nullable=False),
        sa.Column("is_payday", sa.Boolean(), nullable=False),
        sa.Column("festival", sa.String(length=128), nullable=True),
        sa.Column("festival_ramp", sa.Float(), nullable=False),
        sa.Column("is_holiday", sa.Boolean(), nullable=False),
        sa.Column("monsoon", sa.Boolean(), nullable=False),
        sa.Column("is_operating", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("date"),
    )


def downgrade() -> None:
    op.drop_table("calendar")