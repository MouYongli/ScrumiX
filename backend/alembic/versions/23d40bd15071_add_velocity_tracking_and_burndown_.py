"""Add velocity tracking and burndown snapshots

Revision ID: 23d40bd15071
Revises: 10d5ba60568b
Create Date: 2025-09-16 14:52:07.882190

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '23d40bd15071'
down_revision: Union[str, Sequence[str], None] = '10d5ba60568b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add velocity_points column to sprints table
    op.add_column('sprints', sa.Column('velocity_points', sa.Integer(), nullable=False, server_default='0', comment='Total story points completed in this sprint'))
    op.create_index(op.f('ix_sprints_velocity_points'), 'sprints', ['velocity_points'], unique=False)

    # Add completed_at column to backlogs table
    op.add_column('backlogs', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when item was marked as DONE'))
    op.create_index(op.f('ix_backlogs_completed_at'), 'backlogs', ['completed_at'], unique=False)

    # Create burndown_snapshots table
    op.create_table('burndown_snapshots',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sprint_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('completed_story_point', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('remaining_story_point', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['sprint_id'], ['sprints.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for burndown_snapshots
    op.create_index('ix_burndown_snapshots_id', 'burndown_snapshots', ['id'])
    op.create_index('ix_burndown_snapshots_sprint_id', 'burndown_snapshots', ['sprint_id'])
    op.create_index('ix_burndown_snapshots_project_id', 'burndown_snapshots', ['project_id'])
    op.create_index('ix_burndown_snapshots_date', 'burndown_snapshots', ['date'])
    
    # Create composite indexes for efficient queries
    op.create_index('idx_burndown_sprint_date', 'burndown_snapshots', ['sprint_id', 'date'], unique=True)
    op.create_index('idx_burndown_project_date', 'burndown_snapshots', ['project_id', 'date'])
    op.create_index('idx_burndown_sprint_date_points', 'burndown_snapshots', ['sprint_id', 'date', 'completed_story_point', 'remaining_story_point'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop burndown_snapshots table and its indexes
    op.drop_index('idx_burndown_sprint_date_points', table_name='burndown_snapshots')
    op.drop_index('idx_burndown_project_date', table_name='burndown_snapshots')
    op.drop_index('idx_burndown_sprint_date', table_name='burndown_snapshots')
    op.drop_index('ix_burndown_snapshots_date', table_name='burndown_snapshots')
    op.drop_index('ix_burndown_snapshots_project_id', table_name='burndown_snapshots')
    op.drop_index('ix_burndown_snapshots_sprint_id', table_name='burndown_snapshots')
    op.drop_index('ix_burndown_snapshots_id', table_name='burndown_snapshots')
    op.drop_table('burndown_snapshots')
    
    # Remove completed_at column from backlogs table
    op.drop_index(op.f('ix_backlogs_completed_at'), table_name='backlogs')
    op.drop_column('backlogs', 'completed_at')
    
    # Remove velocity_points column from sprints table
    op.drop_index(op.f('ix_sprints_velocity_points'), table_name='sprints')
    op.drop_column('sprints', 'velocity_points')
