"""fix_chat_messages_text_content

Revision ID: 10d5ba60568b
Revises: chat_history_001
Create Date: 2025-09-15 20:36:38.297144

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10d5ba60568b'
down_revision: Union[str, Sequence[str], None] = 'chat_history_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove trigger and function, make text_content a regular column."""
    
    # Drop the trigger first (correct name from the database)
    op.execute("DROP TRIGGER IF EXISTS trigger_update_message_text_content ON chat_messages;")
    
    # Drop the functions
    op.execute("DROP FUNCTION IF EXISTS update_message_text_content();")
    op.execute("DROP FUNCTION IF EXISTS extract_text_from_parts(jsonb);")


def downgrade() -> None:
    """Recreate trigger and function."""
    
    # Recreate the function
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
    
    # Recreate the trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION update_message_text_content()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.text_content := extract_text_from_parts(NEW.parts);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Recreate the trigger
    op.execute("""
        CREATE TRIGGER update_chat_message_text_content
        BEFORE INSERT OR UPDATE ON chat_messages
        FOR EACH ROW EXECUTE FUNCTION update_message_text_content();
    """)
