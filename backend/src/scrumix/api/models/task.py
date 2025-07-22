from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from ..db.base import Base


class TaskStatus(enum.Enum):
    """Task status enumeration."""
    todo = "todo"
    in_progress = "in-progress"
    in_review = "in-review"
    done = "done"
    cancelled = "cancelled"


class Task(Base):
    """Task model for storing task information."""
    
    __tablename__ = "tasks"
    
    task_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus), nullable=False, default=TaskStatus.todo, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Foreign keys to sprint 
    sprint_id = Column(Integer, ForeignKey("sprints.sprint_id"), nullable=False, index=True)

    # Relationship to sprint
    sprint = relationship("Sprint", back_populates="tasks")
    user_tasks = relationship("UserTask", back_populates="task", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_task", back_populates="tasks", overlaps="user_tasks")
    tag_tasks = relationship("TagTask", back_populates="task", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="tag_task", back_populates="tasks", overlaps="tag_tasks")

    def __repr__(self):
        return f"<Task(task_id={self.task_id}, title='{self.title}', status='{self.status.value}')>" 