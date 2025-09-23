"""Add backlog_id to tasks table

Revision ID: add_backlog_id_to_tasks
Revises: 68dc45076940
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_backlog_id_to_tasks'
down_revision = 'add_user_id_to_meeting_action_item'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add backlog_id column to tasks table"""
    # Add backlog_id column
    op.add_column('tasks', sa.Column('backlog_id', sa.Integer(), nullable=True))
    
    # Create index for better performance
    # Note: SQLite doesn't support adding foreign key constraints directly
    # The foreign key relationship will be enforced at the application level
    op.create_index('ix_tasks_backlog_id', 'tasks', ['backlog_id'], unique=False)


def downgrade() -> None:
    """Remove backlog_id column from tasks table"""
    # Drop index
    op.drop_index('ix_tasks_backlog_id', 'tasks')
    
    # Drop column
    op.drop_column('tasks', 'backlog_id')
