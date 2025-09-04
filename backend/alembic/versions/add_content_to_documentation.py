"""Add content field to documentation table

Revision ID: add_content_to_documentation
Revises: add_personal_notes_table
Create Date: 2024-01-01 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_content_to_documentation'
down_revision = 'add_personal_notes_table'
branch_labels = None
depends_on = None


def upgrade():
    """Add content column to documentations table"""
    op.add_column('documentations', sa.Column('content', sa.Text(), nullable=True, comment='Document content in markdown format'))


def downgrade():
    """Remove content column from documentations table"""
    op.drop_column('documentations', 'content')
