"""
Sprint-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
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
    """Sprint main table"""
    __tablename__ = "sprints"

    sprint_id = Column(Integer, primary_key=True, index=True)
    sprint_name = Column(String(255), nullable=False, index=True)
    sprint_goal = Column(String(500), nullable=False, comment="Sprint goal describing what the team aims to achieve")
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(SprintStatus), default=SprintStatus.PLANNING, nullable=False)
    sprint_capacity = Column(Integer, nullable=False, default=0, comment="Sprint capacity in story points or hours")
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # TODO: Add relationships to other entities when implemented
    # project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    # project = relationship("Project", back_populates="sprints")
    # backlog_items = relationship("Backlog", back_populates="sprint") 