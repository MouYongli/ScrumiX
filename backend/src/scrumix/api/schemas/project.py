"""
Project-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict, Field
from scrumix.api.models.project import ProjectStatus


class ProjectBase(BaseModel):
    """Base project schema with common fields."""
    name: str = Field(..., min_length=1, max_length=200, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    status: ProjectStatus = Field(ProjectStatus.ACTIVE, description="Project status")
    start_date: Optional[datetime] = Field(None, description="Project start date")
    end_date: Optional[datetime] = Field(None, description="Project end date")
    color: Optional[str] = Field(None, max_length=20, description="Project color")


class ProjectCreate(ProjectBase):
    """Create project schema"""
    model_config = ConfigDict(populate_by_name=True)


class ProjectUpdate(BaseModel):
    """Update project information schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = Field(default=None, description="Project start date")
    end_date: Optional[datetime] = Field(default=None, description="Project end date")
    color: Optional[str] = None


class ProjectInDB(ProjectBase):
    """Project information in database"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime


class ProjectResponse(ProjectBase):
    """Project response schema for frontend (matches frontend Project interface)"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    # Calculated fields (retrieved from relationships)
    progress: int = 0  # Project progress percentage
    members: int = 1   # Number of project members
    tasks: dict = {"completed": 0, "total": 0}  # Task statistics
    last_activity_at: datetime
    
    @classmethod
    def from_db_model(cls, project: "Project", progress: int = 0, members: int = 1, 
                     tasks_completed: int = 0, tasks_total: int = 0) -> "ProjectResponse":
        """Create response object from database model"""
        return cls(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            start_date=project.start_date,
            end_date=project.end_date,
            color=project.color,
            progress=progress,
            members=members,
            tasks={"completed": tasks_completed, "total": tasks_total},
            last_activity_at=project.last_activity_at
        ) 