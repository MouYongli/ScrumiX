from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class MeetingActionItem(Base):
    """Meeting action item model for storing action items related to meetings."""
    
    __tablename__ = "meeting_action_item"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="User who created the action item")
    title = Column(String(500), nullable=False, comment="Action item title/description")
    due_date = Column(DateTime(timezone=True), nullable=True, comment="Due date for the action item")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="action_items")
    user = relationship("User", back_populates="meeting_action_items")
    
    def __repr__(self):
        return f"<MeetingActionItem(id={self.id}, meeting_id={self.meeting_id}, title='{self.title[:50]}...')>" 