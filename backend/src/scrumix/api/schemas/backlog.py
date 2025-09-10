"""
Backlog-related Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from scrumix.api.models.backlog import Backlog, BacklogStatus, BacklogPriority, BacklogType
from scrumix.api.schemas.acceptance_criteria import AcceptanceCriteriaResponse


class BacklogBase(BaseModel):
    """Backlog item base information"""
    title: str
    description: Optional[str] = None
    status: BacklogStatus = BacklogStatus.TODO
    story_point: Optional[int] = Field(default=None, ge=0, description="Story points for estimation (must be non-negative)")
    priority: BacklogPriority = BacklogPriority.MEDIUM
    label: Optional[str] = None
    item_type: BacklogType = BacklogType.STORY
    parent_id: Optional[int] = Field(default=None, description="Parent backlog item ID")
    assigned_to_id: Optional[int] = Field(default=None, description="Assigned user ID")


class BacklogCreate(BacklogBase):
    """Create backlog item schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    project_id: int


class BacklogUpdate(BaseModel):
    """Update backlog item schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[BacklogStatus] = None
    story_point: Optional[int] = Field(default=None, ge=0, description="Story points for estimation (must be non-negative)")
    priority: Optional[BacklogPriority] = None
    label: Optional[str] = None
    item_type: Optional[BacklogType] = None
    parent_id: Optional[int] = Field(default=None, description="Parent backlog item ID")
    assigned_to_id: Optional[int] = Field(default=None, description="Assigned user ID")


class BacklogInDB(BacklogBase):
    """Backlog item information in database"""
    model_config = ConfigDict(from_attributes=True)
    
    backlog_id: int
    created_at: datetime
    updated_at: datetime


class BacklogResponse(BaseModel):
    """Backlog item response schema for frontend"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    title: str
    description: Optional[str] = None
    status: BacklogStatus
    story_point: Optional[int] = None
    priority: BacklogPriority
    label: Optional[str] = None
    item_type: BacklogType
    parent_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Hierarchical data
    children: Optional[List["BacklogResponse"]] = None
    parent_title: Optional[str] = None  # Title of parent item for display
    
    # Acceptance criteria
    acceptance_criteria: Optional[List["AcceptanceCriteriaResponse"]] = None
    
    @classmethod
    def from_db_model(cls, backlog: "Backlog", children: Optional[List["Backlog"]] = None,
                     parent_title: Optional[str] = None) -> "BacklogResponse":
        """Create response object from database model"""
        children_responses = []
        if children:
            children_responses = [cls.from_db_model(child) for child in children]
        
        # Convert acceptance criteria to response format
        acceptance_criteria_responses = []
        if hasattr(backlog, 'acceptance_criteria') and backlog.acceptance_criteria:
            acceptance_criteria_responses = [
                AcceptanceCriteriaResponse(
                    id=criteria.id,
                    backlog_id=criteria.backlog_id,
                    title=criteria.title,
                    is_met=criteria.is_met,
                    created_at=criteria.created_at,
                    updated_at=criteria.updated_at
                )
                for criteria in backlog.acceptance_criteria
            ]
        
        return cls(
            id=backlog.id,
            title=backlog.title or "",
            description=backlog.description,
            status=backlog.status,
            story_point=backlog.story_point,
            priority=backlog.priority,
            label=backlog.label,
            item_type=backlog.item_type,
            parent_id=backlog.parent_id,
            assigned_to_id=backlog.assigned_to_id,
            created_at=backlog.created_at,
            updated_at=backlog.updated_at,
            children=children_responses if children_responses else None,
            parent_title=parent_title,
            acceptance_criteria=acceptance_criteria_responses if acceptance_criteria_responses else None
        )


# Update forward reference for recursive type
BacklogResponse.model_rebuild() 