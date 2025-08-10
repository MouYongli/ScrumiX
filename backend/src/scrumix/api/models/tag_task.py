from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class TagTask(Base):
    __tablename__ = "tag_task"
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), primary_key=True)

    # Relationships
    tag = relationship("Tag", back_populates="tag_tasks", overlaps="tags,tasks")
    task = relationship("Task", back_populates="tag_tasks", overlaps="tags,tasks") 