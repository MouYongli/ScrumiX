"""
Burndown snapshot model for tracking sprint progress over time
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import date
from scrumix.api.db.base import Base


class BurndownSnapshot(Base):
    """Burndown snapshot model for tracking daily sprint progress."""
    
    __tablename__ = "burndown_snapshots"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    completed_story_point = Column(Integer, nullable=False, default=0)
    remaining_story_point = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    sprint = relationship("Sprint", back_populates="burndown_snapshots")
    project = relationship("Project", back_populates="burndown_snapshots")
    
    # Composite indexes for efficient queries
    __table_args__ = (
        # Unique constraint for one snapshot per day per sprint
        Index('idx_burndown_sprint_date', 'sprint_id', 'date', unique=True),
        
        # Index for project-based queries
        Index('idx_burndown_project_date', 'project_id', 'date'),
        
        # Index for date range queries
        Index('idx_burndown_date', 'date'),
        
        # Index for sprint + date queries (most common)
        Index('idx_burndown_sprint_date_points', 'sprint_id', 'date', 'completed_story_point', 'remaining_story_point'),
    )
    
    def __repr__(self):
        return f"<BurndownSnapshot(sprint_id={self.sprint_id}, date={self.date}, completed={self.completed_story_point}, remaining={self.remaining_story_point})>"
    
    @property
    def total_story_points(self) -> int:
        """Calculate total story points for this snapshot"""
        return self.completed_story_point + self.remaining_story_point
    
    @property
    def completion_percentage(self) -> float:
        """Calculate completion percentage for this snapshot"""
        total = self.total_story_points
        if total == 0:
            return 0.0
        return (self.completed_story_point / total) * 100.0
    
    @classmethod
    def get_today_date(cls) -> date:
        """Get today's date for snapshot creation"""
        return date.today()
