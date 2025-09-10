"""add_embeddings_to_documentation

Revision ID: 2d6391e941af
Revises: 7d5fb4bb1734
Create Date: 2025-09-09 17:11:25.241650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '2d6391e941af'
down_revision: Union[str, Sequence[str], None] = '7d5fb4bb1734'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding columns to documentations table."""
    # Add embedding columns to documentations table
    op.add_column('documentations', sa.Column('embedding', Vector(1536), nullable=True, comment='Combined embedding for title, description, and content'))
    op.add_column('documentations', sa.Column('embedding_updated_at', sa.DateTime(timezone=True), nullable=True, comment='Last time embedding was generated'))
    
    # Create HNSW index for efficient vector similarity search
    op.execute("CREATE INDEX IF NOT EXISTS idx_documentations_embedding_hnsw ON documentations USING hnsw (embedding vector_l2_ops)")


def downgrade() -> None:
    """Remove embedding columns from documentations table."""
    # Drop the vector index first
    op.execute("DROP INDEX IF EXISTS idx_documentations_embedding_hnsw")
    
    # Drop embedding columns
    op.drop_column('documentations', 'embedding_updated_at')
    op.drop_column('documentations', 'embedding')
