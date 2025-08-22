"""Add user_id to meeting_action_item table

Revision ID: add_user_id_to_meeting_action_item
Revises: 68dc45076940
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_user_id_to_meeting_action_item'
down_revision = '68dc45076940'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch operations for SQLite compatibility
    with op.batch_alter_table('meeting_action_item') as batch_op:
        # Add user_id column to meeting_action_item table
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        
        # Create index on user_id
        batch_op.create_index('ix_meeting_action_item_user_id', ['user_id'])


def downgrade() -> None:
    # Use batch operations for SQLite compatibility
    with op.batch_alter_table('meeting_action_item') as batch_op:
        # Remove index
        batch_op.drop_index('ix_meeting_action_item_user_id')
        
        # Remove user_id column
        batch_op.drop_column('user_id')
