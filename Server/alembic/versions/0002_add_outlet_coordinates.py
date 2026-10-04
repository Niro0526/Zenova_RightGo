"""Add latitude and longitude coordinates to outlets table.

Revision ID: 0002_add_outlet_coordinates
Revises: 0001_initial_schema
Create Date: 2026-10-04 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_add_outlet_coordinates'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add latitude and longitude to outlets table
    op.add_column('outlets', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('outlets', sa.Column('longitude', sa.Float(), nullable=True))

def downgrade() -> None:
    op.drop_column('outlets', 'longitude')
    op.drop_column('outlets', 'latitude')
