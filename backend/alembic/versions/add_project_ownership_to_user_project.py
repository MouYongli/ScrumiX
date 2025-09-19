"""add project ownership to user_project

Revision ID: c1d2e3f4g5h6
Revises: 23d40bd15071
Create Date: 2025-09-19 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = '23d40bd15071'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_owner column to user_project table
    # Use server_default for backfilling existing rows, then drop default
    op.add_column(
        'user_project',
        sa.Column(
            'is_owner',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
            comment='Project ownership/admin rights'
        )
    )
    # Drop the server default to avoid implicit defaults on future inserts
    op.alter_column('user_project', 'is_owner', server_default=None)
    
    # Add index on is_owner for performance
    op.create_index('ix_user_project_is_owner', 'user_project', ['is_owner'])
    
    # Add unique constraint to ensure only one owner per project
    # Note: PostgreSQL partial unique constraint syntax
    op.execute("""
        CREATE UNIQUE INDEX uq_project_owner 
        ON user_project (project_id) 
        WHERE is_owner = true
    """)
    
    # Add unique constraint for user-project combination (if not already exists)
    # First check if it exists, then create if it doesn't
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'uq_user_project'
            ) THEN
                ALTER TABLE user_project 
                ADD CONSTRAINT uq_user_project UNIQUE (user_id, project_id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove constraints and indexes
    op.execute("DROP INDEX IF EXISTS uq_project_owner")
    op.execute("ALTER TABLE user_project DROP CONSTRAINT IF EXISTS uq_user_project")
    op.drop_index('ix_user_project_is_owner', table_name='user_project')
    
    # Remove is_owner column
    op.drop_column('user_project', 'is_owner')
