from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class PersonalNote(Base):
    """Personal note model for storing user's personal calendar notes."""
    
    __tablename__ = "personal_notes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    note_date = Column(Date, nullable=False, index=True, comment="Date for the note (YYYY-MM-DD)")
    content = Column(Text, nullable=False, comment="Note content")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="personal_notes")
    project = relationship("Project", back_populates="personal_notes")
    
    def __repr__(self):
        return f"<PersonalNote(id={self.id}, user_id={self.user_id}, date='{self.note_date}', content='{self.content[:50]}...')>"
