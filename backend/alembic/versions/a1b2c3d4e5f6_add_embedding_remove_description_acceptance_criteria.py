"""add_embedding_remove_description_acceptance_criteria

Revision ID: a1b2c3d4e5f6
Revises: 7beefd09c489
Create Date: 2025-09-09 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7beefd09c489'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding column and remove description from acceptance_criteria table."""
    # Remove the description column
    op.drop_column('acceptance_criteria', 'description')
    
    # Add embedding columns
    op.add_column('acceptance_criteria', sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True, comment='Embedding for title'))
    op.add_column('acceptance_criteria', sa.Column('embedding_updated_at', sa.DateTime(timezone=True), nullable=True, comment='Last time embedding was generated'))
    
    # Create HNSW index for efficient vector similarity search
    op.execute("CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_embedding_hnsw ON acceptance_criteria USING hnsw (embedding vector_l2_ops)")


def downgrade() -> None:
    """Revert changes: remove embedding and add back description column."""
    # Drop the vector index first
    op.execute("DROP INDEX IF EXISTS idx_acceptance_criteria_embedding_hnsw")
    
    # Drop embedding columns
    op.drop_column('acceptance_criteria', 'embedding_updated_at')
    op.drop_column('acceptance_criteria', 'embedding')
    
    # Add back description column
    op.add_column('acceptance_criteria', sa.Column('description', sa.Text(), nullable=True, comment='Detailed description of acceptance criteria'))
