"""
Project-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from scrumix.api.models.project import ProjectStatus

class ProjectBase(BaseModel):
    """Project base information"""
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    startDate: datetime = Field(alias="start_date")
    endDate: datetime = Field(alias="end_date")
    color: str = "bg-blue-500"

class ProjectCreate(ProjectBase):
    """Create project schema"""
    model_config = ConfigDict(populate_by_name=True)

class ProjectUpdate(BaseModel):
    """Update project information schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    startDate: Optional[datetime] = Field(alias="start_date", default=None)
    endDate: Optional[datetime] = Field(alias="end_date", default=None)
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
    lastActivity: datetime  # Maps to last_activity_at
    
    @classmethod
    def from_db_model(cls, project: "Project", progress: int = 0, members: int = 1, 
                     tasks_completed: int = 0, tasks_total: int = 0) -> "ProjectResponse":
        """Create response object from database model"""
        return cls(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            startDate=project.start_date,
            endDate=project.end_date,
            color=project.color,
            progress=progress,
            members=members,
            tasks={"completed": tasks_completed, "total": tasks_total},
            lastActivity=project.last_activity_at
        ) 