"""Rename order column to order_index in meeting_agenda table

Revision ID: rename_order_to_order_index
Revises: add_order_to_meeting_agenda
Create Date: 2024-01-01 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rename_order_to_order_index'
down_revision = 'add_order_to_meeting_agenda'
branch_labels = None
depends_on = None


def upgrade():
    """Rename order column to order_index to avoid SQL reserved keyword conflicts"""
    # Drop the old index
    op.drop_index('ix_meeting_agenda_order', 'meeting_agenda')
    
    # Rename the column
    op.alter_column('meeting_agenda', 'order', new_column_name='order_index')
    
    # Create new index with the new column name
    op.create_index('ix_meeting_agenda_order_index', 'meeting_agenda', ['order_index'])


def downgrade():
    """Rename order_index column back to order"""
    # Drop the new index
    op.drop_index('ix_meeting_agenda_order_index', 'meeting_agenda')
    
    # Rename the column back
    op.alter_column('meeting_agenda', 'order_index', new_column_name='order')
    
    # Create the old index
    op.create_index('ix_meeting_agenda_order', 'meeting_agenda', ['order'])
