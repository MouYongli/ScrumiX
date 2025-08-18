"""merge profile fields and backlog tasks migrations

Revision ID: 3d3942b18fb3
Revises: add_backlog_id_to_tasks, add_profile_fields_to_users
Create Date: 2025-08-18 19:52:42.180017

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d3942b18fb3'
down_revision: Union[str, Sequence[str], None] = ('add_backlog_id_to_tasks', 'add_profile_fields_to_users')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
