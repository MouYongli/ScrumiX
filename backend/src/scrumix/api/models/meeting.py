from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from ..db.base import Base


class MeetingType(str, enum.Enum):
    """Meeting type enumeration"""
    TEAM_MEETING = "team_meeting"
    SPRINT_PLANNING = "sprint_planning"
    SPRINT_REVIEW = "sprint_review"
    SPRINT_RETROSPECTIVE = "sprint_retrospective"
    DAILY_STANDUP = "daily_standup"
    OTHER = "other"


class Meeting(Base):
    """Meeting model for storing meeting information."""
    
    __tablename__ = "meetings"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    meeting_type = Column(SQLEnum(MeetingType), nullable=False, default=MeetingType.TEAM_MEETING, index=True)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=False, default=30)
    location = Column(String(500), nullable=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    sprint = relationship("Sprint", back_populates="meetings")
    project = relationship("Project", back_populates="meetings")
    agenda_items = relationship("MeetingAgenda", back_populates="meeting", cascade="all, delete-orphan")
    notes = relationship("MeetingNote", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("MeetingActionItem", back_populates="meeting", cascade="all, delete-orphan")
    meeting_participants = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")
    users = relationship("User", secondary="meeting_participant", back_populates="meetings", overlaps="meeting_participants")
    
    def __repr__(self):
        return f"<Meeting(id={self.id}, type='{self.meeting_type.value}', start='{self.start_datetime}')>" 