"""
Backlog-related Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from scrumix.api.models.backlog import BacklogStatus, BacklogPriority

class BacklogBase(BaseModel):
    """Backlog item base information"""
    title: str
    description: Optional[str] = None
    status: BacklogStatus = BacklogStatus.TODO
    storyPoint: Optional[int] = Field(alias="story_point", default=None)
    priority: BacklogPriority = BacklogPriority.MEDIUM
    label: Optional[str] = None
    parentId: Optional[int] = Field(alias="parent_id", default=None)

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
    storyPoint: Optional[int] = Field(alias="story_point", default=None)
    priority: Optional[BacklogPriority] = None
    label: Optional[str] = None
    parentId: Optional[int] = Field(alias="parent_id", default=None)

class BacklogInDB(BacklogBase):
    """Backlog item information in database"""
    model_config = ConfigDict(from_attributes=True)
    
    backlog_id: int
    created_at: datetime
    updated_at: datetime

class BacklogResponse(BacklogBase):
    """Backlog item response schema for frontend"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int  # Maps to backlog_id for frontend consistency
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    # Hierarchical data
    children: Optional[List["BacklogResponse"]] = None
    parentTitle: Optional[str] = None  # Title of parent item for display
    
    @classmethod
    def from_db_model(cls, backlog: "Backlog", children: Optional[List["Backlog"]] = None,
                     parent_title: Optional[str] = None) -> "BacklogResponse":
        """Create response object from database model"""
        children_responses = []
        if children:
            children_responses = [cls.from_db_model(child) for child in children]
        
        return cls(
            id=backlog.backlog_id,
            title=backlog.title,
            description=backlog.description,
            status=backlog.status,
            storyPoint=backlog.story_point,
            priority=backlog.priority,
            label=backlog.label,
            parentId=backlog.parent_id,
            createdAt=backlog.created_at,
            updatedAt=backlog.updated_at,
            children=children_responses if children_responses else None,
            parentTitle=parent_title
        )

# Update forward reference for recursive type
BacklogResponse.model_rebuild() 