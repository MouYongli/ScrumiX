"""add_pgvector_embeddings

Revision ID: 7d5fb4bb1734
Revises: 703b060bcad4
Create Date: 2025-09-09 15:39:56.509471

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '7d5fb4bb1734'
down_revision: Union[str, Sequence[str], None] = '703b060bcad4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pgvector extension and embedding columns to backlogs table."""
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Add embedding columns to backlogs table
    op.add_column('backlogs', sa.Column('embedding', Vector(1536), nullable=True, comment='Combined embedding for title, description, and acceptance criteria'))
    op.add_column('backlogs', sa.Column('embedding_updated_at', sa.DateTime(timezone=True), nullable=True, comment='Last time embedding was generated'))
    
    # Create HNSW index for efficient vector similarity search
    # Using L2 distance (Euclidean) - you can change to cosine_ops if using cosine similarity
    op.execute("CREATE INDEX IF NOT EXISTS idx_backlogs_embedding_hnsw ON backlogs USING hnsw (embedding vector_l2_ops)")


def downgrade() -> None:
    """Remove pgvector embeddings from backlogs table."""
    # Drop the vector index first
    op.execute("DROP INDEX IF EXISTS idx_backlogs_embedding_hnsw")
    
    # Drop embedding columns
    op.drop_column('backlogs', 'embedding_updated_at')
    op.drop_column('backlogs', 'embedding')
    
    # Note: We don't drop the vector extension as other tables might be using it
    # op.execute("DROP EXTENSION IF EXISTS vector")
