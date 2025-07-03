from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
import enum

from ..db.base import Base


class MeetingType(enum.Enum):
    """Meeting type enumeration."""
    daily_standup = "daily-standup"
    sprint_planning = "sprint-planning"
    sprint_review = "sprint-review"
    sprint_retrospective = "sprint-retrospective"
    backlog_refinement = "backlog-refinement"
    team_meeting = "team-meeting"
    one_on_one = "one-on-one"
    project_kickoff = "project-kickoff"
    client_meeting = "client-meeting"
    other = "other"


class Meeting(Base):
    """Meeting model for storing meeting information."""
    
    __tablename__ = "meetings"
    
    meeting_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_type = Column(SQLEnum(MeetingType), nullable=False, default=MeetingType.team_meeting, index=True)
    start_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=False, default=30, comment="Duration in minutes")
    location = Column(String(200), nullable=True, comment="Meeting location or virtual link")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Meeting(meeting_id={self.meeting_id}, type='{self.meeting_type.value}', start='{self.start_datetime}')>" 