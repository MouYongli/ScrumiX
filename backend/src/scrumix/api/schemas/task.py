from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

from ..models.task import TaskStatus


class TaskBase(BaseModel):
    """Base task schema with common fields."""
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    status: TaskStatus = Field(TaskStatus.todo, description="Task status")


class TaskCreate(TaskBase):
    """Schema for creating a new task."""
    sprint_id: int


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, description="Task description") 
    status: Optional[TaskStatus] = Field(None, description="Task status")


class TaskInDB(TaskBase):
    """Schema for task stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    task_id: int
    created_at: datetime
    updated_at: datetime


class TaskResponse(BaseModel):
    """Schema for task API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    taskId: int = Field(alias="task_id")
    title: str
    description: Optional[str]
    status: TaskStatus
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class TaskListResponse(BaseModel):
    """Schema for paginated task list responses."""
    tasks: list[TaskResponse]
    total: int
    page: int
    pages: int 