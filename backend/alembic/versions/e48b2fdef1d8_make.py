"""Make

Revision ID: e48b2fdef1d8
Revises: 1563045a83ad
Create Date: 2025-09-22 13:44:38.202536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e48b2fdef1d8'
down_revision: Union[str, Sequence[str], None] = '1563045a83ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make meetings.sprint_id nullable
    op.alter_column(
        'meetings',
        'sprint_id',
        existing_type=sa.Integer(),
        nullable=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Revert meetings.sprint_id to NOT NULL
    op.alter_column(
        'meetings',
        'sprint_id',
        existing_type=sa.Integer(),
        nullable=False
    )
