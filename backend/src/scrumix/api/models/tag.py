from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from ..db.base import Base


class Tag(Base):
    """Tag model for storing tag information."""
    
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False, index=True, comment="Tag title")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Tag(id={self.id}, title='{self.title}')>" 