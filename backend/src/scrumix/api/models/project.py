"""
Project-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.vector_utils import get_vector_column
from typing import Optional
from scrumix.api.db.base import Base
from sqlalchemy.orm import relationship

class ProjectStatus(str, Enum):
    """Project status enumeration"""
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"

class Project(Base):
    """Project model for storing project information."""
    
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.ACTIVE, index=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    color = Column(String(20), nullable=True, comment="Project color")
    
    # Vector embedding for semantic search - combined embedding for name and description
    # Note: Vector columns disabled for regular PostgreSQL - use pgvector for semantic search
    # embedding = Column(get_vector_column(1536), nullable=True, comment="Combined embedding for name and description")
    # embedding_updated_at = Column(DateTime(timezone=True), nullable=True, comment="Last time embedding was generated")
    
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    backlogs = relationship("Backlog", back_populates="project", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    documentations = relationship("Documentation", back_populates="project", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="project", cascade="all, delete-orphan")
    personal_notes = relationship("PersonalNote", back_populates="project", cascade="all, delete-orphan")
    burndown_snapshots = relationship("BurndownSnapshot", back_populates="project", cascade="all, delete-orphan")
    
    user_projects = relationship("UserProject", back_populates="project", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_project", back_populates="projects", overlaps="user_projects")
    
    # Chat relationships
    chat_conversations = relationship("ChatConversation", back_populates="project", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status.value}')>"
    
    def get_searchable_content(self) -> str:
        """Generate combined text content for embedding generation"""
        content_parts = []
        
        # Add name (always present)
        content_parts.append(self.name)
        
        # Add status for context
        content_parts.append(f"Status: {self.status.value}")
        
        # Add description if present
        if self.description:
            content_parts.append(self.description)
        
        return "\n".join(content_parts)
    
    def needs_embedding_update(self) -> bool:
        """Check if embedding needs to be updated based on content changes"""
        if not self.embedding_updated_at:
            return True
        
        # Check if content was updated after last embedding update
        if self.updated_at > self.embedding_updated_at:
            return True
        
        return False
    
    