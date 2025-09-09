"""add_embedding_to_projects

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-09-09 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding columns to projects table."""
    # Add embedding columns
    op.add_column('projects', sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True, comment='Combined embedding for name and description'))
    op.add_column('projects', sa.Column('embedding_updated_at', sa.DateTime(timezone=True), nullable=True, comment='Last time embedding was generated'))
    
    # Create HNSW index for efficient vector similarity search
    op.execute("CREATE INDEX IF NOT EXISTS idx_projects_embedding_hnsw ON projects USING hnsw (embedding vector_l2_ops)")


def downgrade() -> None:
    """Remove embedding columns from projects table."""
    # Drop the vector index first
    op.execute("DROP INDEX IF EXISTS idx_projects_embedding_hnsw")
    
    # Drop embedding columns
    op.drop_column('projects', 'embedding_updated_at')
    op.drop_column('projects', 'embedding')
