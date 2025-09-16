"""
Chat history schemas
"""
from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessagePart(BaseModel):
    """Chat message part schema"""
    type: str = Field(..., description="Part type (text, file, etc.)")
    text: Optional[str] = Field(None, description="Text content")
    file_url: Optional[str] = Field(None, description="File URL")


class ChatMessageCreate(BaseModel):
    """Schema for creating a chat message"""
    role: str = Field(..., description="Message role (user, assistant, system)")
    parts: List[ChatMessagePart] = Field(..., description="Message parts")
    tool_name: Optional[str] = Field(None, description="Tool name if tool call")
    tool_call_id: Optional[str] = Field(None, description="Tool call ID if tool call")


class ChatMessageResponse(BaseModel):
    """Schema for chat message response"""
    id: str
    conversation_id: str
    role: str
    parts: List[Dict[str, Any]]
    text_content: Optional[str]
    tool_name: Optional[str]
    tool_call_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatConversationCreate(BaseModel):
    """Schema for creating a chat conversation"""
    id: str
    agent_type: str = Field(..., description="Agent type (product-owner, scrum-master, developer)")
    project_id: Optional[int] = Field(None, description="Project ID")
    title: Optional[str] = Field(None, description="Conversation title")


class ChatConversationUpdate(BaseModel):
    """Schema for updating a chat conversation"""
    title: Optional[str] = Field(None, description="New conversation title")


class ChatConversationResponse(BaseModel):
    """Schema for chat conversation response"""
    id: str
    user_id: Optional[int]
    project_id: Optional[int]
    agent_type: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    summary: Optional[str]

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Schema for chat history response"""
    conversation: ChatConversationResponse
    messages: List[ChatMessageResponse]


class SaveMessageRequest(BaseModel):
    """Schema for saving a message"""
    conversation_id: str
    message: ChatMessageCreate


class ChatStreamRequest(BaseModel):
    """Schema for chat stream request"""
    conversation_id: str
    message: ChatMessageCreate
    agent_type: str = Field(..., description="Agent type (product-owner, scrum-master, developer)")
