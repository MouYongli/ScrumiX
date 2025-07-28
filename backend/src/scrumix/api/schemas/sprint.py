"""
Sprint-related Pydantic schemas
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional
from ..models.sprint import SprintStatus


class SprintBase(BaseModel):
    """Base sprint schema with common fields."""
    model_config = ConfigDict(populate_by_name=True)
    
    sprint_name: str = Field(..., min_length=1, max_length=100, description="Name of the sprint", alias="sprintName")
    sprint_goal: Optional[str] = Field(None, description="Goal of the sprint", alias="sprintGoal")
    start_date: datetime = Field(..., description="Sprint start date", alias="startDate")
    end_date: datetime = Field(..., description="Sprint end date", alias="endDate")
    status: SprintStatus = Field(SprintStatus.PLANNING, description="Status of the sprint")
    sprint_capacity: Optional[int] = Field(None, ge=0, description="Sprint capacity in story points", alias="sprintCapacity")
    project_id: int = Field(..., gt=0, description="ID of the project this sprint belongs to", alias="projectId")
    
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, values):
        """Validate end date is after start date."""
        if 'start_date' in values.data and v <= values.data['start_date']:
            raise ValueError('End date must be after start date')
        return v


class SprintCreate(SprintBase):
    """Schema for creating a new sprint."""
    pass


class SprintUpdate(BaseModel):
    """Schema for updating an existing sprint."""
    model_config = ConfigDict(populate_by_name=True)
    
    sprint_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Name of the sprint", alias="sprintName")
    sprint_goal: Optional[str] = Field(None, description="Goal of the sprint", alias="sprintGoal")
    start_date: Optional[datetime] = Field(None, description="Sprint start date", alias="startDate")
    end_date: Optional[datetime] = Field(None, description="Sprint end date", alias="endDate")
    status: Optional[SprintStatus] = Field(None, description="Status of the sprint")
    sprint_capacity: Optional[int] = Field(None, ge=0, description="Sprint capacity in story points", alias="sprintCapacity")
    
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, values):
        """Validate end date is after start date if both are provided."""
        if v and 'start_date' in values.data and values.data['start_date'] and v <= values.data['start_date']:
            raise ValueError('End date must be after start date')
        return v


class SprintInDB(SprintBase):
    """Schema for sprint stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime


class SprintResponse(BaseModel):
    """Schema for sprint API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, use_enum_values=True)
    
    id: int
    sprint_name: str
    sprint_goal: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: SprintStatus
    sprint_capacity: Optional[int] = None
    project_id: int
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_db_model(cls, sprint):
        """Create a response model from an ORM model."""
        return cls(
            id=sprint.id,
            sprint_name=sprint.sprint_name,
            sprint_goal=sprint.sprint_goal,
            start_date=sprint.start_date,
            end_date=sprint.end_date,
            status=sprint.status,
            sprint_capacity=sprint.sprint_capacity,
            project_id=sprint.project_id,
            created_at=sprint.created_at,
            updated_at=sprint.updated_at
        ) 