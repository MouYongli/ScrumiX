from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class MeetingAgenda(Base):
    """Meeting agenda model for storing meeting agenda items."""
    
    __tablename__ = "meeting_agenda"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False, comment="Agenda item title/description")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship to meeting
    meeting = relationship("Meeting", back_populates="agenda_items")
    
    def __repr__(self):
        return f"<MeetingAgenda(id={self.id}, meeting_id={self.meeting_id}, title='{self.title[:50]}...')>" 