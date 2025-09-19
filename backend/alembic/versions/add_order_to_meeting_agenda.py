"""Add order column to meeting_agenda table

Revision ID: add_order_to_meeting_agenda
Revises: add_personal_notes_table
Create Date: 2024-01-01 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_order_to_meeting_agenda'
down_revision = '1964dcb11413'
branch_labels = None
depends_on = None


def upgrade():
    """Add order column to meeting_agenda table"""
    # Add the order column with default value 0
    op.add_column('meeting_agenda', sa.Column('order', sa.Integer(), nullable=False, server_default='0', comment='Order of agenda item in the meeting'))
    
    # Create index for the order column
    op.create_index('ix_meeting_agenda_order', 'meeting_agenda', ['order'])
    
    # Update existing records to have proper ordering based on their creation order
    # This ensures existing agenda items get sequential order values
    op.execute("""
        WITH ordered_agenda AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY meeting_id ORDER BY created_at, id) as new_order
            FROM meeting_agenda
        )
        UPDATE meeting_agenda 
        SET "order" = ordered_agenda.new_order
        FROM ordered_agenda 
        WHERE meeting_agenda.id = ordered_agenda.id
    """)


def downgrade():
    """Remove order column from meeting_agenda table"""
    op.drop_index('ix_meeting_agenda_order', 'meeting_agenda')
    op.drop_column('meeting_agenda', 'order')
