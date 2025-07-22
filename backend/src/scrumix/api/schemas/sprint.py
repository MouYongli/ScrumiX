"""
Sprint-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from scrumix.api.models.sprint import SprintStatus

class SprintBase(BaseModel):
    """Sprint base information"""
    sprint_name: str = Field(alias="sprintName")
    sprint_goal: str = Field(alias="sprintGoal")
    start_date: datetime = Field(alias="startDate")
    end_date: datetime = Field(alias="endDate")
    status: SprintStatus = SprintStatus.PLANNING
    sprint_capacity: int = Field(alias="sprintCapacity", ge=0, default=0)
    
    # Allow alternative field names for backward compatibility
    name: Optional[str] = None
    goal: Optional[str] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        # Map alternative field names to standard names
        if self.name and not self.sprint_name:
            self.sprint_name = self.name
        if self.goal and not self.sprint_goal:
            self.sprint_goal = self.goal

    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        """Validate that end_date is after start_date"""
        start_date = info.data.get('start_date')
        if start_date and v <= start_date:
            raise ValueError('End date must be after start date')
        return v

class SprintCreate(SprintBase):
    """Create sprint schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    project_id: int

class SprintUpdate(BaseModel):
    """Update sprint schema"""
    model_config = ConfigDict(populate_by_name=True)
    
    sprint_name: Optional[str] = Field(None, alias="sprintName")
    sprint_goal: Optional[str] = Field(None, alias="sprintGoal")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")
    status: Optional[SprintStatus] = None
    sprint_capacity: Optional[int] = Field(None, alias="sprintCapacity", ge=0)

    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        """Validate that end_date is after start_date"""
        if v is None:
            return v
        start_date = info.data.get('start_date')
        if start_date and v <= start_date:
            raise ValueError('End date must be after start date')
        return v

class SprintInDB(SprintBase):
    """Sprint information in database"""
    model_config = ConfigDict(from_attributes=True)
    
    sprint_id: int
    created_at: datetime
    updated_at: datetime

class SprintResponse(SprintBase):
    """Sprint response schema for frontend"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int  # Maps to sprint_id for frontend consistency
    sprintName: str = Field(alias="sprint_name")
    sprintGoal: str = Field(alias="sprint_goal")
    startDate: datetime = Field(alias="start_date")
    endDate: datetime = Field(alias="end_date")
    sprintCapacity: int = Field(alias="sprint_capacity")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    # Calculated fields for frontend display
    duration: Optional[int] = None  # Duration in days
    isActive: Optional[bool] = None  # Whether sprint is currently active
    isCompleted: Optional[bool] = None  # Whether sprint is completed
    
    @classmethod
    def from_db_model(cls, sprint: "Sprint") -> "SprintResponse":
        """Create response object from database model"""
        # Calculate duration in days
        duration = (sprint.end_date - sprint.start_date).days if sprint.start_date and sprint.end_date else None
        
        # Check if sprint is active (current date between start and end)
        now = datetime.now(sprint.start_date.tzinfo if sprint.start_date.tzinfo else None)
        is_active = (sprint.status == SprintStatus.ACTIVE and 
                    sprint.start_date <= now <= sprint.end_date) if sprint.start_date and sprint.end_date else False
        
        # Check if sprint is completed
        is_completed = sprint.status == SprintStatus.COMPLETED
        
        return cls(
            id=sprint.sprint_id,
            sprint_name=sprint.sprint_name,
            sprint_goal=sprint.sprint_goal,
            start_date=sprint.start_date,
            end_date=sprint.end_date,
            status=sprint.status,
            sprint_capacity=sprint.sprint_capacity,
            createdAt=sprint.created_at,
            updatedAt=sprint.updated_at,
            sprintName=sprint.sprint_name,
            sprintGoal=sprint.sprint_goal,
            startDate=sprint.start_date,
            endDate=sprint.end_date,
            sprintCapacity=sprint.sprint_capacity,
            duration=duration,
            isActive=is_active,
            isCompleted=is_completed
        ) 