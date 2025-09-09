"""add_embeddings_to_tasks

Revision ID: c75bfefbd9e8
Revises: 7beefd09c489
Create Date: 2025-09-09 17:34:49.333581

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision: str = 'c75bfefbd9e8'
down_revision: Union[str, Sequence[str], None] = '7beefd09c489'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding columns to tasks table."""
    # Add embedding columns to tasks table
    op.add_column('tasks', sa.Column('title_embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True, comment='Embedding for title'))
    op.add_column('tasks', sa.Column('description_embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True, comment='Embedding for description'))
    op.add_column('tasks', sa.Column('embedding_updated_at', sa.DateTime(timezone=True), nullable=True, comment='Last time embeddings were generated'))
    
    # Create HNSW indexes for efficient vector similarity search
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_title_embedding_hnsw ON tasks USING hnsw (title_embedding vector_l2_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_description_embedding_hnsw ON tasks USING hnsw (description_embedding vector_l2_ops)")


def downgrade() -> None:
    """Remove embedding columns from tasks table."""
    # Drop the vector indexes first
    op.execute("DROP INDEX IF EXISTS idx_tasks_title_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_tasks_description_embedding_hnsw")
    
    # Drop embedding columns
    op.drop_column('tasks', 'embedding_updated_at')
    op.drop_column('tasks', 'description_embedding')
    op.drop_column('tasks', 'title_embedding')
