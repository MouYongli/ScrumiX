from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from typing import Optional

from ..db.base import Base


class AcceptanceCriteria(Base):
    """Acceptance criteria model for storing acceptance criteria information."""
    
    __tablename__ = "acceptance_criteria"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    backlog_id = Column(Integer, ForeignKey("backlogs.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False, comment="Acceptance criteria description")
    is_met = Column(Boolean, default=False, nullable=False, comment="Whether the criteria is met")
    
    # Vector embedding for semantic search
    embedding = Column(Vector(1536), nullable=True, comment="Embedding for title")
    embedding_updated_at = Column(DateTime(timezone=True), nullable=True, comment="Last time embedding was generated")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to backlog
    backlog = relationship("Backlog", back_populates="acceptance_criteria")
    
    def __repr__(self):
        return f"<AcceptanceCriteria(id={self.id}, backlog_id={self.backlog_id}, title='{self.title[:50]}...')>"
    
    def get_searchable_content(self) -> str:
        """Generate text content for embedding generation"""
        return self.title
    
    def needs_embedding_update(self) -> bool:
        """Check if embedding needs to be updated based on content changes"""
        if not self.embedding_updated_at:
            return True
        
        # Check if content was updated after last embedding update
        if self.updated_at > self.embedding_updated_at:
            return True
        
        return False 