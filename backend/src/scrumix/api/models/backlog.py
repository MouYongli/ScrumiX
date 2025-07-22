"""
Backlog-related database models - OPTIMIZED VERSION
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text, ForeignKey, Index, func
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

class BacklogType(str, Enum):
    """Backlog item type enumeration"""
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
    BUG = "bug"
    FEATURE = "feature"
    IMPROVEMENT = "improvement"

class Backlog(Base):
    """Backlog item main table - OPTIMIZED"""
    __tablename__ = "backlogs"

    backlog_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(BacklogStatus), default=BacklogStatus.TODO, nullable=False, index=True)
    
    # Enhanced agile planning fields
    story_point = Column(Integer, nullable=True, index=True)  # Story points for estimation
    priority = Column(SQLEnum(BacklogPriority), default=BacklogPriority.MEDIUM, nullable=False, index=True)
    label = Column(String(100), nullable=True, index=True)  # Tags/labels for categorization
    item_type = Column(SQLEnum(BacklogType), default=BacklogType.STORY, nullable=False, index=True)
    
    # Enhanced hierarchical structure with performance optimizations
    parent_id = Column(Integer, ForeignKey("backlogs.backlog_id"), nullable=True, index=True)
    root_id = Column(Integer, ForeignKey("backlogs.backlog_id"), nullable=True, index=True)  # Direct reference to root
    level = Column(Integer, default=0, nullable=False, index=True)  # Hierarchy level (0 = root)
    path = Column(String(500), nullable=True, index=True)  # Materialized path for efficient queries
    
    # Performance and tracking fields
    estimated_hours = Column(Integer, nullable=True)  # Time estimation in hours
    actual_hours = Column(Integer, nullable=True)  # Actual time spent
    due_date = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Self-referential relationship for hierarchical structure
    parent = relationship("Backlog", remote_side=[backlog_id], foreign_keys=[parent_id], back_populates="children")
    children = relationship("Backlog", foreign_keys=[parent_id], back_populates="parent")
    root = relationship("Backlog", remote_side=[backlog_id], foreign_keys=[root_id], back_populates="descendants")
    descendants = relationship("Backlog", foreign_keys=[root_id], back_populates="root")
    
    # Relationship to acceptance criteria
    acceptance_criteria = relationship("AcceptanceCriteria", back_populates="backlog", cascade="all, delete-orphan")
    
    # Foreign keys to user, project, and sprint
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Direct assignee
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.sprint_id"), nullable=True, index=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_id], backref="created_backlog_items")
    assignee = relationship("User", foreign_keys=[assigned_to_id], backref="assigned_backlog_items")
    project = relationship("Project", backref="backlog_items")
    sprint = relationship("Sprint", backref="backlog_items")
    
    # Composite indexes for common query patterns
    __table_args__ = (
        # Index for project + status queries (most common)
        Index('idx_backlog_project_status', 'project_id', 'status'),
        
        # Index for sprint + status queries
        Index('idx_backlog_sprint_status', 'sprint_id', 'status'),
        
        # Index for priority + status queries
        Index('idx_backlog_priority_status', 'priority', 'status'),
        
        # Index for assignee + status queries
        Index('idx_backlog_assignee_status', 'assigned_to_id', 'status'),
        
        # Index for due date queries
        Index('idx_backlog_due_date', 'due_date'),
        
        # Index for completed items
        Index('idx_backlog_completed', 'completed_at'),
        
        # Index for story points queries
        Index('idx_backlog_story_points', 'story_point'),
        
        # Index for hierarchical queries
        Index('idx_backlog_root_level', 'root_id', 'level'),
        
        # Full-text search index for title and description
        Index('idx_backlog_fts', 'title', 'description', postgresql_using='gin'),
        
        # Index for type + status queries
        Index('idx_backlog_type_status', 'item_type', 'status'),
        
        # Index for project + priority queries
        Index('idx_backlog_project_priority', 'project_id', 'priority'),
        
        # Index for sprint + priority queries
        Index('idx_backlog_sprint_priority', 'sprint_id', 'priority'),
    )
    
    def __repr__(self):
        return f"<Backlog(id={self.backlog_id}, title='{self.title}', status='{self.status.value}')>"
    
    def get_full_path(self) -> str:
        """Get the full hierarchical path of this item"""
        if not self.path:
            return self.title
        return f"{self.path} > {self.title}"
    
    def is_root(self) -> bool:
        """Check if this is a root item"""
        return self.parent_id is None
    
    def is_leaf(self) -> bool:
        """Check if this is a leaf item (no children)"""
        return not self.children
    
    def get_level(self) -> int:
        """Get the hierarchy level of this item"""
        return self.level
    
    def get_estimated_total_points(self) -> int:
        """Get total story points including children"""
        total = self.story_point or 0
        for child in self.children:
            total += child.get_estimated_total_points()
        return total
    
    def get_actual_total_hours(self) -> int:
        """Get total actual hours including children"""
        total = self.actual_hours or 0
        for child in self.children:
            total += child.get_actual_total_hours()
        return total 