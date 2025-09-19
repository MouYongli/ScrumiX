"""
User-Task association model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from enum import Enum
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class UserTaskRole(str, Enum):
    """User role in task enumeration"""
    ASSIGNEE = "assignee"
    REVIEWER = "reviewer"
    WATCHER = "watcher"

class UserTask(Base):
    """Association table for User-Task many-to-many relationship"""
    __tablename__ = "user_task"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    role = Column(SQLEnum(UserTaskRole), nullable=False, default=UserTaskRole.ASSIGNEE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="user_tasks", overlaps="tasks,users")
    task = relationship("Task", back_populates="user_tasks", overlaps="tasks,users")

    def __repr__(self):
        return f"<UserTask(user_id={self.user_id}, task_id={self.task_id}, role='{self.role.value}')>"