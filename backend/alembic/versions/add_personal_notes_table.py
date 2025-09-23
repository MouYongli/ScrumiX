"""Add personal_notes table

Revision ID: add_personal_notes_table
Revises: fa13d5ee26ab
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_personal_notes_table'
down_revision = 'fa13d5ee26ab'
branch_labels = None
depends_on = None


def upgrade():
    """Add personal_notes table"""
    op.create_table('personal_notes',
        sa.Column('id', sa.Integer(), primary_key=True, index=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id'), nullable=False, index=True),
        sa.Column('note_date', sa.Date(), nullable=False, index=True, comment='Date for the note (YYYY-MM-DD)'),
        sa.Column('content', sa.Text(), nullable=False, comment='Note content'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_personal_notes_id', 'personal_notes', ['id'])
    op.create_index('ix_personal_notes_user_id', 'personal_notes', ['user_id'])
    op.create_index('ix_personal_notes_project_id', 'personal_notes', ['project_id'])
    op.create_index('ix_personal_notes_note_date', 'personal_notes', ['note_date'])


def downgrade():
    """Remove personal_notes table"""
    op.drop_index('ix_personal_notes_note_date', 'personal_notes')
    op.drop_index('ix_personal_notes_project_id', 'personal_notes')
    op.drop_index('ix_personal_notes_user_id', 'personal_notes')
    op.drop_index('ix_personal_notes_id', 'personal_notes')
    op.drop_table('personal_notes')
