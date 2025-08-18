"""Add profile fields to users table

Revision ID: add_profile_fields_to_users
Revises: add_user_id_to_meeting_action_item
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_profile_fields_to_users'
down_revision = 'add_user_id_to_meeting_action_item'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new profile fields to users table
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('department', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove the added columns
    op.drop_column('users', 'bio')
    op.drop_column('users', 'location')
    op.drop_column('users', 'department')
    op.drop_column('users', 'phone')
