"""
Tag-Documentation association model
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class TagDocumentation(Base):
    """Association table for Tag-Documentation many-to-many relationship"""
    __tablename__ = "tag_documentation"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    documentation_id = Column(Integer, ForeignKey("documentations.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tag = relationship("Tag", back_populates="tag_documentations")
    documentation = relationship("Documentation", back_populates="tag_documentations")

    def __repr__(self):
        return f"<TagDocumentation(tag_id={self.tag_id}, documentation_id={self.documentation_id})>"