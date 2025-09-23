"""add unique role constraints for scrum master and product owner

Revision ID: d2e3f4g5h6i7
Revises: c1d2e3f4g5h6
Create Date: 2025-09-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2e3f4g5h6i7'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4g5h6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unique partial indexes to ensure only one Scrum Master and one Product Owner per project
    op.execute("""
        CREATE UNIQUE INDEX uq_project_scrum_master 
        ON user_project (project_id) 
        WHERE role = 'SCRUM_MASTER'
    """)
    
    op.execute("""
        CREATE UNIQUE INDEX uq_project_product_owner 
        ON user_project (project_id) 
        WHERE role = 'PRODUCT_OWNER'
    """)


def downgrade() -> None:
    # Remove the unique constraints
    op.execute("DROP INDEX IF EXISTS uq_project_scrum_master")
    op.execute("DROP INDEX IF EXISTS uq_project_product_owner")
