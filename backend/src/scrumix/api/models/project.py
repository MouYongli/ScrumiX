"""
Project-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base
from sqlalchemy.orm import relationship

class ProjectStatus(str, Enum):
    """Project status enumeration"""
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on-hold"
    COMPLETED = "completed"

class Project(Base):
    """Project main table"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNING, nullable=False)
    
    # Project dates
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    # Project settings
    color = Column(String(50), default="bg-blue-500", nullable=False)
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user_projects = relationship("UserProject", back_populates="project", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_project", back_populates="projects")
    
    