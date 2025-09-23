from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.vector_utils import get_vector_column
from typing import Optional

from ..db.base import Base

class TaskStatus(str, Enum):
    """Task status enumeration"""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Task priority enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Task(Base):
    """Task model for storing task information."""
    
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus), nullable=False, default=TaskStatus.TODO, index=True)
    priority = Column(SQLEnum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM, index=True)
    
    # Vector embedding for semantic search - combined embedding for title, description, status, and priority
    embedding = Column(get_vector_column(1536), nullable=True, comment="Combined embedding for title, description, status, and priority")
    embedding_updated_at = Column(DateTime(timezone=True), nullable=True, comment="Last time embedding was generated")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Foreign keys to sprint and backlog
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=False, index=True)
    backlog_id = Column(Integer, ForeignKey("backlogs.id"), nullable=False, index=True)

    # Relationships
    sprint = relationship("Sprint", back_populates="tasks")
    backlog = relationship("Backlog", back_populates="tasks")
    user_tasks = relationship("UserTask", back_populates="task", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_task", back_populates="tasks", overlaps="user_tasks")
    tag_tasks = relationship("TagTask", back_populates="task", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="tag_task", back_populates="tasks", overlaps="tag_tasks")

    @property
    def task_id(self) -> int:
        """Backward compatibility property for tests"""
        return self.id

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status.value}')>"
    
    def get_searchable_content(self) -> str:
        """Generate combined text content for embedding generation"""
        content_parts = []
        
        # Add title (always present)
        content_parts.append(self.title)
        
        # Add status and priority for context
        content_parts.append(f"Status: {self.status.value}")
        content_parts.append(f"Priority: {self.priority.value}")
        
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