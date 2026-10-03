"""Persist driver delivery completion at trip-stop and trip level."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_driver_delivery_completion"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "released_trips",
        sa.Column("completed_stops_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "trip_stops",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("outlet_id", sa.String(length=32), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("delivery_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.ForeignKeyConstraint(["trip_id"], ["released_trips.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trip_stops_trip_id"), "trip_stops", ["trip_id"], unique=False)
    op.create_index(op.f("ix_trip_stops_outlet_id"), "trip_stops", ["outlet_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_trip_stops_outlet_id"), table_name="trip_stops")
    op.drop_index(op.f("ix_trip_stops_trip_id"), table_name="trip_stops")
    op.drop_table("trip_stops")
    op.drop_column("released_trips", "completed_stops_count")