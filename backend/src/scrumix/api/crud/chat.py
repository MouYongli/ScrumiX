"""
CRUD operations for chat history
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid

from ..models.chat import ChatConversation, ChatMessage
from ..schemas.chat import ChatConversationCreate, ChatMessageCreate


class ChatCRUD:
    """CRUD operations for chat history"""

    def create_conversation(
        self, 
        db: Session, 
        conversation_data: ChatConversationCreate,
        user_id: Optional[int] = None
    ) -> ChatConversation:
        """Create a new chat conversation"""
        db_conversation = ChatConversation(
            id=conversation_data.id,
            user_id=user_id,
            project_id=conversation_data.project_id,
            agent_type=conversation_data.agent_type,
            title=conversation_data.title
        )
        db.add(db_conversation)
        db.commit()
        db.refresh(db_conversation)
        return db_conversation

    def get_conversation(self, db: Session, conversation_id: str) -> Optional[ChatConversation]:
        """Get a conversation by ID"""
        return db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()

    def upsert_conversation(
        self,
        db: Session,
        conversation_data: ChatConversationCreate,
        user_id: Optional[int] = None
    ) -> ChatConversation:
        """Create or update a conversation"""
        existing = self.get_conversation(db, conversation_data.id)
        if existing:
            # Update last_message_at
            existing.last_message_at = datetime.now()
            if conversation_data.title and not existing.title:
                existing.title = conversation_data.title
            db.commit()
            db.refresh(existing)
            return existing
        else:
            return self.create_conversation(db, conversation_data, user_id)

    def create_message(
        self,
        db: Session,
        conversation_id: str,
        message_data: ChatMessageCreate
    ) -> ChatMessage:
        """Create a new chat message"""
        # Generate text content from parts
        text_content = None
        if message_data.parts:
            text_parts = []
            for part in message_data.parts:
                if hasattr(part, 'text') and part.text and getattr(part, 'type', None) == 'text':
                    text_parts.append(part.text)
                elif isinstance(part, dict) and part.get('type') == 'text' and part.get('text'):
                    text_parts.append(part['text'])
            if text_parts:
                text_content = '\n'.join(text_parts)

        # Convert parts to dict format for JSON storage
        parts_dict = []
        for part in message_data.parts:
            if hasattr(part, 'model_dump'):
                parts_dict.append(part.model_dump())
            elif hasattr(part, 'dict'):
                parts_dict.append(part.dict())
            else:
                parts_dict.append(dict(part))

        db_message = ChatMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=message_data.role,
            parts=parts_dict,
            text_content=text_content,
            tool_name=message_data.tool_name,
            tool_call_id=message_data.tool_call_id
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        return db_message

    def get_conversation_messages(
        self, 
        db: Session, 
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[ChatMessage]:
        """Get messages for a conversation"""
        query = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).order_by(ChatMessage.created_at)
        
        if limit:
            query = query.limit(limit)
        
        return query.all()

    def get_user_conversations(
        self,
        db: Session,
        user_id: int,
        agent_type: Optional[str] = None,
        limit: int = 50
    ) -> List[ChatConversation]:
        """Get conversations for a user"""
        query = db.query(ChatConversation).filter(
            ChatConversation.user_id == user_id
        )
        
        if agent_type:
            query = query.filter(ChatConversation.agent_type == agent_type)
        
        return query.order_by(desc(ChatConversation.last_message_at)).limit(limit).all()


# Create instance
chat_crud = ChatCRUD()
