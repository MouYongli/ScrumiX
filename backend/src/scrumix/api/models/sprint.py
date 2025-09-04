"""
Sprint-related database models
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base

class SprintStatus(str, Enum):
    """Sprint status enumeration"""
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Sprint(Base):
    """Sprint model for storing sprint information."""
    
    __tablename__ = "sprints"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sprint_name = Column(String(100), nullable=False, index=True)
    sprint_goal = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(SprintStatus), default=SprintStatus.PLANNING, nullable=False)
    sprint_capacity = Column(Integer, nullable=True, default=0)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="sprints")
    backlogs = relationship("Backlog", back_populates="sprint", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="sprint", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="sprint", cascade="all, delete-orphan")
    
    @property
    def sprint_id(self) -> int:
        """Backward compatibility property for tests"""
        return self.id
    
    def __repr__(self):
        return f"<Sprint(id={self.id}, name='{self.sprint_name}', status='{self.status.value}')>"