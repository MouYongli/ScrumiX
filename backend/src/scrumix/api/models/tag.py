from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from ..db.base import Base


class Tag(Base):
    """Tag model for storing tag information."""
    
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False, index=True, comment="Tag title")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    tag_documentations = relationship("TagDocumentation", back_populates="tag", cascade="all, delete-orphan")
    documentations = relationship("Documentation", secondary="tag_documentation", back_populates="tags", overlaps="tag_documentations")
    tag_tasks = relationship("TagTask", back_populates="tag", cascade="all, delete-orphan")
    tasks = relationship("Task", secondary="tag_task", back_populates="tags", overlaps="tag_tasks")
    
    def __repr__(self):
        return f"<Tag(id={self.id}, title='{self.title}')>" 