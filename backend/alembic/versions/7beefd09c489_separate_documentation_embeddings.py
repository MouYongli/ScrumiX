"""separate_documentation_embeddings

Revision ID: 7beefd09c489
Revises: 2d6391e941af
Create Date: 2025-09-09 17:16:12.439843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '7beefd09c489'
down_revision: Union[str, Sequence[str], None] = '2d6391e941af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace single embedding with separate embeddings for title, description, and content."""
    # Drop the old embedding column and index
    op.execute("DROP INDEX IF EXISTS idx_documentations_embedding_hnsw")
    op.drop_column('documentations', 'embedding')
    
    # Add separate embedding columns
    op.add_column('documentations', sa.Column('title_embedding', Vector(1536), nullable=True, comment='Embedding for title'))
    op.add_column('documentations', sa.Column('description_embedding', Vector(1536), nullable=True, comment='Embedding for description'))
    op.add_column('documentations', sa.Column('content_embedding', Vector(1536), nullable=True, comment='Embedding for content'))
    
    # Create HNSW indexes for each embedding field
    op.execute("CREATE INDEX IF NOT EXISTS idx_documentations_title_embedding_hnsw ON documentations USING hnsw (title_embedding vector_l2_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_documentations_description_embedding_hnsw ON documentations USING hnsw (description_embedding vector_l2_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_documentations_content_embedding_hnsw ON documentations USING hnsw (content_embedding vector_l2_ops)")


def downgrade() -> None:
    """Revert to single embedding column."""
    # Drop the separate embedding indexes and columns
    op.execute("DROP INDEX IF EXISTS idx_documentations_title_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_documentations_description_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_documentations_content_embedding_hnsw")
    
    op.drop_column('documentations', 'content_embedding')
    op.drop_column('documentations', 'description_embedding')
    op.drop_column('documentations', 'title_embedding')
    
    # Add back the single embedding column
    op.add_column('documentations', sa.Column('embedding', Vector(1536), nullable=True, comment='Combined embedding for title, description, and content'))
    op.execute("CREATE INDEX IF NOT EXISTS idx_documentations_embedding_hnsw ON documentations USING hnsw (embedding vector_l2_ops)")
