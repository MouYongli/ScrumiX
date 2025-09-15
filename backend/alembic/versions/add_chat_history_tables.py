"""add_chat_history_tables

Revision ID: chat_history_001
Revises: b2c3d4e5f6g7
Create Date: 2025-09-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = 'chat_history_001'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add chat history tables with pgvector support."""
    
    # Create chat_conversations table
    op.create_table(
        'chat_conversations',
        sa.Column('id', sa.Text(), nullable=False, comment='Conversation ID from client or server-generated'),
        sa.Column('user_id', sa.Integer(), nullable=True, comment='Link to users table if accessible'),
        sa.Column('project_id', sa.Integer(), nullable=True, comment='Associated project ID'),
        sa.Column('agent_type', sa.Text(), nullable=False, comment='Agent type: product-owner, scrum-master, developer'),
        sa.Column('title', sa.Text(), nullable=True, comment='Optional conversation title'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), comment='When conversation was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), comment='Last update time'),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), comment='Time of last message'),
        sa.Column('summary', sa.Text(), nullable=True, comment='AI-generated conversation summary'),
        sa.Column('memory_embedding', Vector(1536), nullable=True, comment='Embedding for conversation memory and retrieval'),
        sa.PrimaryKeyConstraint('id'),
        comment='Chat conversations with long-term memory support'
    )
    
    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Text(), nullable=False, comment='Server-generated message ID'),
        sa.Column('conversation_id', sa.Text(), nullable=False, comment='Reference to conversation'),
        sa.Column('role', sa.Text(), nullable=False, comment='Message role: user, assistant, system, tool'),
        sa.Column('parts', sa.JSON(), nullable=False, comment='AI-SDK UIMessage.parts array'),
        sa.Column('text_content', sa.Text(), nullable=True, comment='Extracted text content for search'),
        sa.Column('embedding', Vector(1536), nullable=True, comment='Message embedding for semantic search'),
        sa.Column('tool_name', sa.Text(), nullable=True, comment='Tool name if this is a tool call/result'),
        sa.Column('tool_call_id', sa.Text(), nullable=True, comment='Tool call ID for tracking'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), comment='Message creation time'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['conversation_id'], ['chat_conversations.id'], ondelete='CASCADE'),
        comment='Individual chat messages with semantic search support'
    )
    
    # Create indexes for efficient queries
    op.create_index('idx_chat_conversations_agent_project', 'chat_conversations', ['agent_type', 'project_id'])
    op.create_index('idx_chat_conversations_user_time', 'chat_conversations', ['user_id', 'last_message_at'])
    op.create_index('idx_chat_messages_conversation_time', 'chat_messages', ['conversation_id', 'created_at'])
    op.create_index('idx_chat_messages_role', 'chat_messages', ['role'])
    
    # Create HNSW indexes for vector similarity search
    op.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_embedding_hnsw ON chat_messages USING hnsw (embedding vector_l2_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_chat_conversations_memory_embedding_hnsw ON chat_conversations USING hnsw (memory_embedding vector_l2_ops)")
    
    # Create function to automatically extract text content from JSONB parts
    op.execute("""
        CREATE OR REPLACE FUNCTION extract_text_from_parts(parts JSONB)
        RETURNS TEXT AS $$
        BEGIN
            RETURN (
                SELECT string_agg(p->>'text', E'\n')
                FROM jsonb_array_elements(parts) AS p
                WHERE p->>'type' = 'text'
            );
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
    """)
    
    # Create trigger to automatically update text_content when parts change
    op.execute("""
        CREATE OR REPLACE FUNCTION update_message_text_content()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.text_content := extract_text_from_parts(NEW.parts);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_message_text_content
        BEFORE INSERT OR UPDATE OF parts ON chat_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_message_text_content();
    """)
    
    # Create trigger to update conversation timestamps
    op.execute("""
        CREATE OR REPLACE FUNCTION update_conversation_timestamps()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE chat_conversations 
            SET last_message_at = NEW.created_at, updated_at = now()
            WHERE id = NEW.conversation_id;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_conversation_timestamps
        AFTER INSERT ON chat_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_timestamps();
    """)


def downgrade() -> None:
    """Remove chat history tables and functions."""
    
    # Drop triggers and functions
    op.execute("DROP TRIGGER IF EXISTS trigger_update_conversation_timestamps ON chat_messages")
    op.execute("DROP TRIGGER IF EXISTS trigger_update_message_text_content ON chat_messages")
    op.execute("DROP FUNCTION IF EXISTS update_conversation_timestamps()")
    op.execute("DROP FUNCTION IF EXISTS update_message_text_content()")
    op.execute("DROP FUNCTION IF EXISTS extract_text_from_parts(JSONB)")
    
    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_chat_conversations_memory_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_chat_messages_embedding_hnsw")
    op.drop_index('idx_chat_messages_role')
    op.drop_index('idx_chat_messages_conversation_time')
    op.drop_index('idx_chat_conversations_user_time')
    op.drop_index('idx_chat_conversations_agent_project')
    
    # Drop tables
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')
