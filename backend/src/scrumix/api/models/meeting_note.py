from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class MeetingNote(Base):
    """Meeting note model for storing meeting notes with hierarchical structure."""
    
    __tablename__ = "meeting_note"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False, comment="Note content")
    parent_note_id = Column(Integer, ForeignKey("meeting_note.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to meeting
    meeting = relationship("Meeting", back_populates="notes")
    user = relationship("User", back_populates="meeting_notes")
    
    # Self-referential relationship for hierarchical structure
    parent_note = relationship("MeetingNote", remote_side=[id], back_populates="child_notes")
    child_notes = relationship("MeetingNote", back_populates="parent_note", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<MeetingNote(id={self.id}, meeting_id={self.meeting_id}, content='{self.content[:50]}...')>" 