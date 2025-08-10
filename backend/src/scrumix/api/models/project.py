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
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"

class Project(Base):
    """Project model for storing project information."""
    
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.ACTIVE, index=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    color = Column(String(20), nullable=True, comment="Project color")
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    backlogs = relationship("Backlog", back_populates="project", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    documentations = relationship("Documentation", back_populates="project", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="project", cascade="all, delete-orphan")
    
    user_projects = relationship("UserProject", back_populates="project", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_project", back_populates="projects", overlaps="user_projects")
    
    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status.value}')>"
    
    