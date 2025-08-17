from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

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
    story_point = Column(Integer, nullable=True, default=None)
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