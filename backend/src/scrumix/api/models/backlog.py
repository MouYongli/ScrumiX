"""
Backlog-related database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base

class BacklogStatus(str, Enum):
    """Backlog item status enumeration"""
    TODO = "todo"
    IN_PROGRESS = "in-progress" 
    IN_REVIEW = "in-review"
    DONE = "done"
    CANCELLED = "cancelled"

class BacklogPriority(str, Enum):
    """Backlog item priority enumeration"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Backlog(Base):
    """Backlog item main table"""
    __tablename__ = "backlogs"

    backlog_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(BacklogStatus), default=BacklogStatus.TODO, nullable=False)
    
    # Agile planning fields
    story_point = Column(Integer, nullable=True)  # Story points for estimation
    priority = Column(SQLEnum(BacklogPriority), default=BacklogPriority.MEDIUM, nullable=False)
    label = Column(String(100), nullable=True)  # Tags/labels for categorization
    
    # Hierarchical structure
    parent_id = Column(Integer, ForeignKey("backlogs.backlog_id"), nullable=True)
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Self-referential relationship for hierarchical structure
    parent = relationship("Backlog", remote_side=[backlog_id], back_populates="children")
    children = relationship("Backlog", back_populates="parent")
    
    # Relationship to acceptance criteria
    acceptance_criteria = relationship("AcceptanceCriteria", back_populates="backlog", cascade="all, delete-orphan")
    
    # Foreign keys to user, project, and sprint
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.sprint_id"), nullable=True, index=True)

    # Relationships
    creator = relationship("User", backref="created_backlog_items")
    project = relationship("Project", backref="backlog_items")
    sprint = relationship("Sprint", backref="backlog_items")
    