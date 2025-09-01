"""add_notifications_tables

Revision ID: 7ea2ee4709d6
Revises: b8b79a9ce086
Create Date: 2025-08-21 20:00:44.910313

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ea2ee4709d6'
down_revision: Union[str, Sequence[str], None] = 'b8b79a9ce086'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.Enum('TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_DEADLINE_APPROACHING', 'MEETING_CREATED', 'MEETING_REMINDER', 'MEETING_UPDATED', 'MEETING_CANCELLED', 'SPRINT_STARTED', 'SPRINT_COMPLETED', 'SPRINT_UPDATED', 'BACKLOG_CREATED', 'BACKLOG_UPDATED', 'BACKLOG_ASSIGNED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED', 'PROJECT_STATUS_CHANGED', 'MENTION', 'SYSTEM_ANNOUNCEMENT', 'DEADLINE_APPROACHING', name='notificationtype'), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='notificationpriority'), nullable=False),
        sa.Column('action_url', sa.String(length=500), nullable=True),
        sa.Column('action_text', sa.String(length=100), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('meeting_id', sa.Integer(), nullable=True),
        sa.Column('backlog_item_id', sa.Integer(), nullable=True),
        sa.Column('sprint_id', sa.Integer(), nullable=True),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['backlog_item_id'], ['backlogs.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['sprint_id'], ['sprints.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_backlog_item_id'), 'notifications', ['backlog_item_id'], unique=False)
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
    op.create_index(op.f('ix_notifications_created_by_id'), 'notifications', ['created_by_id'], unique=False)
    op.create_index(op.f('ix_notifications_expires_at'), 'notifications', ['expires_at'], unique=False)
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_meeting_id'), 'notifications', ['meeting_id'], unique=False)
    op.create_index(op.f('ix_notifications_notification_type'), 'notifications', ['notification_type'], unique=False)
    op.create_index(op.f('ix_notifications_priority'), 'notifications', ['priority'], unique=False)
    op.create_index(op.f('ix_notifications_project_id'), 'notifications', ['project_id'], unique=False)
    op.create_index(op.f('ix_notifications_sprint_id'), 'notifications', ['sprint_id'], unique=False)
    op.create_index(op.f('ix_notifications_task_id'), 'notifications', ['task_id'], unique=False)
    op.create_index(op.f('ix_notifications_title'), 'notifications', ['title'], unique=False)

    # Create user_notifications table
    op.create_table('user_notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('notification_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('UNREAD', 'READ', 'DISMISSED', name='notificationstatus'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivery_method', sa.Enum('IN_APP', 'EMAIL', 'PUSH', name='deliverymethod'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_notifications_id'), 'user_notifications', ['id'], unique=False)
    op.create_index(op.f('ix_user_notifications_notification_id'), 'user_notifications', ['notification_id'], unique=False)
    op.create_index(op.f('ix_user_notifications_status'), 'user_notifications', ['status'], unique=False)
    op.create_index(op.f('ix_user_notifications_user_id'), 'user_notifications', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_notifications_user_id'), table_name='user_notifications')
    op.drop_index(op.f('ix_user_notifications_status'), table_name='user_notifications')
    op.drop_index(op.f('ix_user_notifications_notification_id'), table_name='user_notifications')
    op.drop_index(op.f('ix_user_notifications_id'), table_name='user_notifications')
    op.drop_table('user_notifications')
    op.drop_index(op.f('ix_notifications_title'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_task_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_sprint_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_project_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_priority'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_notification_type'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_meeting_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_expires_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_created_by_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_backlog_item_id'), table_name='notifications')
    op.drop_table('notifications')
