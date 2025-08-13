from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

from ..models.task import TaskStatus, TaskPriority


class TaskBase(BaseModel):
    """Base task schema with common fields."""
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    status: TaskStatus = Field(TaskStatus.TODO, description="Task status")
    priority: TaskPriority = Field(TaskPriority.MEDIUM, description="Task priority")
    story_point: Optional[int] = Field(None, ge=0, description="Story points for estimation (must be non-negative)")
    sprint_id: Optional[int] = Field(None, gt=0, description="ID of the sprint this task belongs to")


class TaskCreate(TaskBase):
    """Schema for creating a new task."""
    model_config = ConfigDict(populate_by_name=True)


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    model_config = ConfigDict(populate_by_name=True)
    
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    status: Optional[TaskStatus] = Field(None, description="Task status")
    priority: Optional[TaskPriority] = Field(None, description="Task priority")
    story_point: Optional[int] = Field(None, ge=0, description="Story points for estimation (must be non-negative)")


class TaskInDB(TaskBase):
    """Schema for task stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    task_id: int
    created_at: datetime
    updated_at: datetime


class TaskResponse(BaseModel):
    """Schema for task API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    story_point: Optional[int]
    sprint_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm(cls, obj):
        """Create response object from ORM model (for compatibility)"""
        return cls(
            id=obj.id,
            title=obj.title,
            description=obj.description,
            status=obj.status,
            priority=obj.priority,
            story_point=obj.story_point,
            sprint_id=obj.sprint_id,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class TaskListResponse(BaseModel):
    """Schema for paginated task list responses."""
    tasks: list[TaskResponse]
    total: int
    page: int
    pages: int 