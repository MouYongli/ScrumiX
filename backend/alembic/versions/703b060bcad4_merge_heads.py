"""merge_heads

Revision ID: 703b060bcad4
Revises: add_content_to_documentation, rename_order_to_order_index
Create Date: 2025-09-09 15:39:32.240400

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '703b060bcad4'
down_revision: Union[str, Sequence[str], None] = ('add_content_to_documentation', 'rename_order_to_order_index')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
