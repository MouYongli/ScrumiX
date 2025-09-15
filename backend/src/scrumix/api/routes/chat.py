"""
Chat history API routes
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.security import get_current_user
from ..db.database import get_db
from ..crud.chat import chat_crud
from ..schemas.chat import (
    ChatConversationCreate, ChatConversationResponse,
    ChatMessageCreate, ChatMessageResponse,
    ChatHistoryResponse, SaveMessageRequest
)
from ..models.user import User

router = APIRouter()


@router.post("/conversations", response_model=ChatConversationResponse)
async def create_conversation(
    conversation_data: ChatConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat conversation"""
    try:
        conversation = chat_crud.create_conversation(
            db=db,
            conversation_data=conversation_data,
            user_id=current_user.id
        )
        return ChatConversationResponse.model_validate(conversation)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=ChatHistoryResponse)
async def get_conversation_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat conversation history"""
    try:
        # Get conversation - if it doesn't exist, return empty history
        conversation = chat_crud.get_conversation(db, conversation_id)
        if not conversation:
            # Return empty conversation structure for non-existent conversations
            return ChatHistoryResponse(
                conversation=ChatConversationResponse(
                    id=conversation_id,
                    user_id=None,
                    project_id=None,
                    agent_type="unknown",
                    title=None,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    last_message_at=datetime.now(),
                    summary=None
                ),
                messages=[]
            )
        
        # Check if user has access (optional: add proper authorization logic)
        # For now, allow access to all conversations
        
        # Get messages
        messages = chat_crud.get_conversation_messages(db, conversation_id)
        
        return ChatHistoryResponse(
            conversation=ChatConversationResponse.model_validate(conversation),
            messages=[ChatMessageResponse.model_validate(msg) for msg in messages]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}"
        )


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageResponse)
async def save_message(
    conversation_id: str,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a message to a conversation"""
    try:
        # Verify conversation exists
        conversation = chat_crud.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Create message
        message = chat_crud.create_message(
            db=db,
            conversation_id=conversation_id,
            message_data=message_data
        )
        
        return ChatMessageResponse.model_validate(message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save message: {str(e)}"
        )


@router.post("/conversations/upsert", response_model=ChatConversationResponse)
async def upsert_conversation(
    conversation_data: ChatConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a chat conversation"""
    try:
        conversation = chat_crud.upsert_conversation(
            db=db,
            conversation_data=conversation_data,
            user_id=current_user.id
        )
        return ChatConversationResponse.model_validate(conversation)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upsert conversation: {str(e)}"
        )


@router.get("/conversations", response_model=List[ChatConversationResponse])
async def get_user_conversations(
    agent_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversations for the current user"""
    try:
        conversations = chat_crud.get_user_conversations(
            db=db,
            user_id=current_user.id,
            agent_type=agent_type,
            limit=limit
        )
        return [ChatConversationResponse.model_validate(conv) for conv in conversations]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}"
        )
