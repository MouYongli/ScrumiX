from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class UserMeeting(Base):
    __tablename__ = "user_meeting"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.meeting_id"), primary_key=True)

    # Relationships
    user = relationship("User", back_populates="user_meetings")
    meeting = relationship("Meeting", back_populates="user_meetings") 