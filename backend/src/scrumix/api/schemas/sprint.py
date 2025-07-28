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
    sprint_name: str = Field(..., alias="sprintName")
    sprint_goal: Optional[str] = Field(None, alias="sprintGoal")
    start_date: datetime = Field(..., alias="startDate")
    end_date: datetime = Field(..., alias="endDate")
    status: SprintStatus
    sprint_capacity: Optional[int] = Field(None, alias="sprintCapacity")
    project_id: int = Field(..., alias="projectId")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    
    @classmethod
    def from_db_model(cls, sprint):
        """Create a response model from an ORM model."""
        return cls(
            id=sprint.id,
            sprint_name=sprint.sprint_name,  # Use actual field name
            sprint_goal=sprint.sprint_goal,  # Use actual field name
            start_date=sprint.start_date,    # Use actual field name
            end_date=sprint.end_date,        # Use actual field name
            status=sprint.status,
            sprint_capacity=sprint.sprint_capacity,  # Use actual field name
            project_id=sprint.project_id,    # Use actual field name
            created_at=sprint.created_at,    # Use actual field name
            updated_at=sprint.updated_at     # Use actual field name
        ) 