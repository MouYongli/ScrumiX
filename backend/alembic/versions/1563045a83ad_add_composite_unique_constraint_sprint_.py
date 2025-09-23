"""add_composite_unique_constraint_sprint_name_project

Revision ID: 1563045a83ad
Revises: d2e3f4g5h6i7
Create Date: 2025-09-21 23:37:23.728588

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1563045a83ad'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4g5h6i7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add composite unique constraint for sprint_name and project_id
    op.create_unique_constraint(
        'unique_sprint_name_per_project',
        'sprints',
        ['sprint_name', 'project_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the composite unique constraint
    op.drop_constraint(
        'unique_sprint_name_per_project',
        'sprints',
        type_='unique'
    )
