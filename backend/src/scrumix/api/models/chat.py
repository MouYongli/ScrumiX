"""
Chat history models
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from scrumix.api.db.vector_utils import get_vector_column

from ..db.base import Base


class ChatConversation(Base):
    """Chat conversation model"""
    __tablename__ = "chat_conversations"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    agent_type = Column(String, nullable=False)  # 'product-owner', 'scrum-master', 'developer'
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    summary = Column(Text, nullable=True)
    # Note: Vector columns disabled for regular PostgreSQL - use pgvector for semantic search
    # memory_embedding = Column(get_vector_column(1536), nullable=True)

    # Relationships
    user = relationship("User", back_populates="chat_conversations")
    project = relationship("Project", back_populates="chat_conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Chat message model"""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user', 'assistant', 'system'
    parts = Column(JSON, nullable=False)  # Message parts (text, files, etc.)
    text_content = Column(Text, nullable=True)  # Extracted text content for search
    # Note: Vector columns disabled for regular PostgreSQL - use pgvector for semantic search
    # embedding = Column(get_vector_column(1536), nullable=True)
    tool_name = Column(String, nullable=True)
    tool_call_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")
