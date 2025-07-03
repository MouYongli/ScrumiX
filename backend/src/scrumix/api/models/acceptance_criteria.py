from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class AcceptanceCriteria(Base):
    """Acceptance criteria model for storing acceptance criteria information."""
    
    __tablename__ = "acceptance_criteria"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    backlog_id = Column(Integer, ForeignKey("backlogs.backlog_id"), nullable=False, index=True)
    title = Column(String(500), nullable=False, comment="Acceptance criteria description")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Foreign keys to backlog
    backlog_id = Column(Integer, ForeignKey("backlogs.backlog_id"), nullable=False, index=True)
    # Relationship to backlog
    backlog = relationship("Backlog", back_populates="acceptance_criteria")
    
    def __repr__(self):
        return f"<AcceptanceCriteria(id={self.id}, backlog_id={self.backlog_id}, title='{self.title[:50]}...')>" 