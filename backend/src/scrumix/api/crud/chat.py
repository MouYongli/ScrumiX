"""
CRUD operations for chat history
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid

from ..models.chat import ChatConversation, ChatMessage
from ..schemas.chat import ChatConversationCreate, ChatMessageCreate, ChatConversationUpdate


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
        # Filter parts to only keep text; drop any non-text content
        filtered_text_parts: List[str] = []
        filtered_parts: List[dict] = []
        if message_data.parts:
            for part in message_data.parts:
                if isinstance(part, dict):
                    if part.get('type') == 'text' and part.get('text'):
                        filtered_text_parts.append(part['text'])
                        filtered_parts.append({'type': 'text', 'text': part['text']})
                else:
                    p_type = getattr(part, 'type', None)
                    p_text = getattr(part, 'text', None)
                    if p_type == 'text' and p_text:
                        filtered_text_parts.append(p_text)
                        filtered_parts.append({'type': 'text', 'text': p_text})

        text_content = '\n'.join(filtered_text_parts) if filtered_text_parts else None

        db_message = ChatMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=message_data.role,
            parts=filtered_parts,
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

    def delete_conversation(
        self,
        db: Session,
        conversation_id: str,
        user_id: Optional[int] = None
    ) -> bool:
        """Delete a conversation and all its messages"""
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        
        if not conversation:
            return False
            
        # Optional: Check if user has permission to delete this conversation
        if user_id is not None and conversation.user_id != user_id:
            return False
        
        # Delete the conversation (messages will be deleted automatically due to cascade)
        db.delete(conversation)
        db.commit()
        return True

    def delete_conversation_messages(
        self,
        db: Session,
        conversation_id: str,
        user_id: Optional[int] = None
    ) -> bool:
        """Delete all messages from a conversation but keep the conversation"""
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        
        if not conversation:
            return False
            
        # Optional: Check if user has permission to modify this conversation
        if user_id is not None and conversation.user_id != user_id:
            return False
        
        # Delete all messages for this conversation
        db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).delete()
        
        # Update conversation metadata
        conversation.last_message_at = datetime.now()
        conversation.summary = None
        
        db.commit()
        return True

    def update_message(
        self,
        db: Session,
        message_id: str,
        content: str,
        user_id: Optional[int] = None
    ) -> Optional[ChatMessage]:
        """Update a message's content"""
        message = db.query(ChatMessage).filter(
            ChatMessage.id == message_id
        ).first()
        
        if not message:
            return None
        
        # Get the conversation to check ownership
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == message.conversation_id
        ).first()
        
        if not conversation:
            return None
            
        # Check if user has permission to update this message
        if user_id is not None and conversation.user_id != user_id:
            return None
        
        # Update message content and text_content
        message.parts = [{'type': 'text', 'text': content}]
        message.text_content = content
        
        # Update conversation last_message_at
        conversation.last_message_at = datetime.now()
        
        db.commit()
        db.refresh(message)
        return message

    def delete_messages_after(
        self,
        db: Session,
        conversation_id: str,
        after_message_id: str,
        user_id: Optional[int] = None
    ) -> bool:
        """Delete all messages after a specific message in a conversation"""
        # Get the conversation to check ownership
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        
        if not conversation:
            return False
            
        # Check if user has permission to modify this conversation
        if user_id is not None and conversation.user_id != user_id:
            return False
        
        # Get the reference message to find its creation time
        reference_message = db.query(ChatMessage).filter(
            ChatMessage.id == after_message_id,
            ChatMessage.conversation_id == conversation_id
        ).first()
        
        if not reference_message:
            return False
        
        # Delete all messages created after the reference message
        deleted_count = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.created_at > reference_message.created_at
        ).delete()
        
        # Update conversation metadata
        conversation.last_message_at = datetime.now()
        
        db.commit()
        return True

    def update_conversation(
        self,
        db: Session,
        conversation_id: str,
        conversation_update: ChatConversationUpdate,
        user_id: Optional[int] = None
    ) -> Optional[ChatConversation]:
        """Update a chat conversation"""
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        
        if not conversation:
            return None
            
        # Check if user has permission to update this conversation
        if user_id is not None and conversation.user_id != user_id:
            return None
        
        # Update fields
        if conversation_update.title is not None:
            conversation.title = conversation_update.title
        
        conversation.updated_at = datetime.now()
        
        db.commit()
        db.refresh(conversation)
        return conversation


# Create instance
chat_crud = ChatCRUD()
