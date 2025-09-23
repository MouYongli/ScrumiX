"""add_user_notification_preferences

Revision ID: fa13d5ee26ab
Revises: 7ea2ee4709d6
Create Date: 2025-08-22 19:20:13.195087

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa13d5ee26ab'
down_revision: Union[str, Sequence[str], None] = '7ea2ee4709d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the old table and recreate with new structure for SQLite compatibility
    op.drop_table('user_notification_preferences')
    
    # Create the new user_notification_preferences table
    op.create_table('user_notification_preferences',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.Enum('TASK_UPDATES', 'SPRINT_UPDATES', 'MEETING_REMINDERS', 'DOCUMENTATION_REMINDERS', 'BACKLOG_REMINDERS', 'PROJECT_UPDATES', 'DEADLINE_REMINDERS', name='notificationcategory'), nullable=False),
        sa.Column('delivery_channel', sa.Enum('IN_APP', 'EMAIL', 'PUSH', name='deliverychannel'), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_notification_preferences_id'), 'user_notification_preferences', ['id'], unique=False)
    op.create_index(op.f('ix_user_notification_preferences_user_id'), 'user_notification_preferences', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_notification_preferences_category'), 'user_notification_preferences', ['category'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # For simplicity, just drop the new table - this is a development environment
    op.drop_table('user_notification_preferences')
