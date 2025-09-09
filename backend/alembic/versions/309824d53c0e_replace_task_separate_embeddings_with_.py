"""replace_task_separate_embeddings_with_combined

Revision ID: 309824d53c0e
Revises: c75bfefbd9e8
Create Date: 2025-09-09 18:02:31.539024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision: str = '309824d53c0e'
down_revision: Union[str, Sequence[str], None] = 'c75bfefbd9e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace separate task embeddings with single combined embedding."""
    # Drop existing task embedding indexes
    op.execute("DROP INDEX IF EXISTS idx_tasks_title_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_tasks_description_embedding_hnsw")
    
    # Drop the separate embedding columns
    op.drop_column('tasks', 'description_embedding')
    op.drop_column('tasks', 'title_embedding')
    
    # Add the new combined embedding column
    op.add_column('tasks', sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True, comment='Combined embedding for title, description, status, and priority'))
    
    # Update the comment for embedding_updated_at
    op.alter_column('tasks', 'embedding_updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               comment='Last time embedding was generated',
               existing_comment='Last time embeddings were generated',
               existing_nullable=True)
    
    # Create HNSW index for the new combined embedding
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_embedding_hnsw ON tasks USING hnsw (embedding vector_l2_ops)")


def downgrade() -> None:
    """Revert to separate task embeddings."""
    # Drop the combined embedding index
    op.execute("DROP INDEX IF EXISTS idx_tasks_embedding_hnsw")
    
    # Drop the combined embedding column
    op.drop_column('tasks', 'embedding')
    
    # Add back the separate embedding columns
    op.add_column('tasks', sa.Column('title_embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), autoincrement=False, nullable=True, comment='Embedding for title'))
    op.add_column('tasks', sa.Column('description_embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), autoincrement=False, nullable=True, comment='Embedding for description'))
    
    # Revert the comment for embedding_updated_at
    op.alter_column('tasks', 'embedding_updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               comment='Last time embeddings were generated',
               existing_comment='Last time embedding was generated',
               existing_nullable=True)
    
    # Recreate the separate embedding indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_title_embedding_hnsw ON tasks USING hnsw (title_embedding vector_l2_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_description_embedding_hnsw ON tasks USING hnsw (description_embedding vector_l2_ops)")
