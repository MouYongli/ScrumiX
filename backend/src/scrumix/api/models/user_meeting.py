"""
User-Meeting association model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from enum import Enum
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class UserMeetingRole(str, Enum):
    """User role in meeting enumeration"""
    ORGANIZER = "organizer"
    PARTICIPANT = "participant"
    OPTIONAL = "optional"

class UserMeeting(Base):
    """Association table for User-Meeting many-to-many relationship"""
    __tablename__ = "user_meeting"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    role = Column(SQLEnum(UserMeetingRole), nullable=False, default=UserMeetingRole.PARTICIPANT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="user_meetings")
    meeting = relationship("Meeting", back_populates="user_meetings")

    def __repr__(self):
        return f"<UserMeeting(user_id={self.user_id}, meeting_id={self.meeting_id}, role='{self.role.value}')>"