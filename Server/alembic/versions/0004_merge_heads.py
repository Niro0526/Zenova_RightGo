"""merge outlet_coordinates and auth_sessions heads

Revision ID: 0004_merge_heads
Revises: 0002_add_outlet_coordinates, 0003_auth_sessions
Create Date: 2026-10-04 18:53:34.772912

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_merge_heads'
down_revision: Union[str, None] = ('0002_add_outlet_coordinates', '0003_auth_sessions')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
