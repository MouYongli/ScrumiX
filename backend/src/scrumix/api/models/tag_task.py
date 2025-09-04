"""
Tag-Task association model
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class TagTask(Base):
    """Association table for Tag-Task many-to-many relationship"""
    __tablename__ = "tag_task"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tag = relationship("Tag", back_populates="tag_tasks", overlaps="tags,tasks")
    task = relationship("Task", back_populates="tag_tasks", overlaps="tags,tasks")

    def __repr__(self):
        return f"<TagTask(tag_id={self.tag_id}, task_id={self.task_id})>"