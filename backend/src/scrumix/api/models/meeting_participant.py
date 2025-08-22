"""
Meeting-Participant association model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from enum import Enum
from sqlalchemy.orm import relationship

from scrumix.api.db.base import Base

class MeetingParticipantRole(str, Enum):
    """User role in meeting enumeration - aligned with ScrumRole values + external role"""
    SCRUM_MASTER = "scrum_master"
    PRODUCT_OWNER = "product_owner"
    DEVELOPER = "developer"
    GUEST = "guest"

class MeetingParticipant(Base):
    """Association table for User-Meeting many-to-many relationship"""
    __tablename__ = "meeting_participant"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    role = Column(String(20), nullable=False, default=MeetingParticipantRole.GUEST.value)
    external_name = Column(String, nullable=True)
    external_email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="meeting_participants")
    meeting = relationship("Meeting", back_populates="meeting_participants")

    def __repr__(self):
        return f"<MeetingParticipant(user_id={self.user_id}, meeting_id={self.meeting_id}, role='{self.role.value}')>"