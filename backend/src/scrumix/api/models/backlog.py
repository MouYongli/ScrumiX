"""
Backlog-related database models 
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from pgvector.sqlalchemy import Vector
from typing import Optional
from scrumix.api.db.base import Base

class BacklogStatus(str, Enum):
    """Backlog item status enumeration"""
    TODO = "todo"
    IN_PROGRESS = "in_progress" 
    IN_REVIEW = "in_review"
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

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(BacklogStatus), default=BacklogStatus.TODO, nullable=False, index=True)
    
    # Enhanced agile planning fields
    story_point = Column(Integer, nullable=True, index=True)  # Story points for estimation
    priority = Column(SQLEnum(BacklogPriority), default=BacklogPriority.MEDIUM, nullable=False, index=True)
    label = Column(String(100), nullable=True, index=True)  # Tags/labels for categorization
    item_type = Column(SQLEnum(BacklogType), default=BacklogType.STORY, nullable=False, index=True)
    
    # Enhanced hierarchical structure with performance optimizations
    parent_id = Column(Integer, ForeignKey("backlogs.id"), nullable=True, index=True)
    root_id = Column(Integer, ForeignKey("backlogs.id"), nullable=True, index=True)  # Direct reference to root
    level = Column(Integer, default=0, nullable=False, index=True)  # Hierarchy level (0 = root)
    path = Column(String(500), nullable=True, index=True)  # Materialized path for efficient queries
    
    # Vector embedding for semantic search
    embedding = Column(Vector(1536), nullable=True, comment="Combined embedding for title, description, and acceptance criteria")
    embedding_updated_at = Column(DateTime(timezone=True), nullable=True, comment="Last time embedding was generated")
    
    # System timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Self-referential relationship for hierarchical structure
    parent = relationship("Backlog", remote_side=[id], foreign_keys=[parent_id], back_populates="children")
    children = relationship("Backlog", foreign_keys=[parent_id], back_populates="parent")
    root = relationship("Backlog", remote_side=[id], foreign_keys=[root_id], back_populates="descendants")
    descendants = relationship("Backlog", foreign_keys=[root_id], back_populates="root")
    
    # Relationship to acceptance criteria
    acceptance_criteria = relationship("AcceptanceCriteria", back_populates="backlog", cascade="all, delete-orphan")
    
    # Foreign keys to user, project, and sprint
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Direct assignee
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True, index=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_id])
    assignee = relationship("User", foreign_keys=[assigned_to_id])
    project = relationship("Project", back_populates="backlogs")
    sprint = relationship("Sprint", back_populates="backlogs")
    tasks = relationship("Task", back_populates="backlog", cascade="all, delete-orphan")
    
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
        
        # Index for story points queries
        Index('idx_backlog_story_points', 'story_point'),
        
        # Index for hierarchical queries
        Index('idx_backlog_root_level', 'root_id', 'level'),
        
        # B-tree indexes for title and description
        Index('idx_backlog_title', 'title'),
        Index('idx_backlog_description', 'description'),
        
        # Index for type + status queries
        Index('idx_backlog_type_status', 'item_type', 'status'),
        
        # Index for project + priority queries
        Index('idx_backlog_project_priority', 'project_id', 'priority'),
        
        # Index for sprint + priority queries
        Index('idx_backlog_sprint_priority', 'sprint_id', 'priority'),
        
        # Vector similarity search index (HNSW for high-dimensional vectors)
        # Note: This will be created in migration as it requires special syntax
    )
    
    @property
    def backlog_id(self) -> int:
        """Backward compatibility property for tests"""
        return self.id
    
    def __repr__(self):
        return f"<Backlog(id={self.id}, title='{self.title}', status='{self.status.value}')>"
    
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
    
    def get_searchable_content(self) -> str:
        """Generate combined text for embedding generation"""
        content_parts = []
        
        # Add title (always present)
        content_parts.append(self.title)
        
        # Add description if present
        if self.description:
            content_parts.append(self.description)
        
        # Add label if present
        if self.label:
            content_parts.append(f"Label: {self.label}")
        
        # Add type and priority for context
        content_parts.append(f"Type: {self.item_type.value}")
        content_parts.append(f"Priority: {self.priority.value}")
        
        # Add acceptance criteria if available
        if hasattr(self, 'acceptance_criteria') and self.acceptance_criteria:
            criteria_texts = []
            for criteria in self.acceptance_criteria:
                criteria_text = criteria.title
                # Note: AcceptanceCriteria only has title, not description
                criteria_texts.append(criteria_text)
            
            if criteria_texts:
                content_parts.append("Acceptance Criteria:")
                content_parts.extend(criteria_texts)
        
        return "\n".join(content_parts)
    
    def needs_embedding_update(self) -> bool:
        """Check if embedding needs to be updated based on content changes"""
        if not self.embedding_updated_at:
            return True
        
        # Check if content was updated after last embedding update
        if self.updated_at > self.embedding_updated_at:
            return True
        
        # Check if any acceptance criteria were updated after last embedding update
        if hasattr(self, 'acceptance_criteria') and self.acceptance_criteria:
            for criteria in self.acceptance_criteria:
                if criteria.updated_at > self.embedding_updated_at:
                    return True
        
        return False