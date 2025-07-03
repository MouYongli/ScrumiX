from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class AcceptanceCriteriaBase(BaseModel):
    """Base acceptance criteria schema with common fields."""
    backlog_id: int = Field(..., gt=0, description="ID of the backlog item this criteria belongs to")
    title: str = Field(..., min_length=1, max_length=500, description="Acceptance criteria description")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if not v or not v.strip():
            raise ValueError('Acceptance criteria title cannot be empty')
        return v.strip()


class AcceptanceCriteriaCreate(AcceptanceCriteriaBase):
    """Schema for creating a new acceptance criteria."""
    pass


class AcceptanceCriteriaUpdate(BaseModel):
    """Schema for updating an existing acceptance criteria."""
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Acceptance criteria description")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Acceptance criteria title cannot be empty')
        return v.strip() if v else v


class AcceptanceCriteriaInDB(AcceptanceCriteriaBase):
    """Schema for acceptance criteria stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime


class AcceptanceCriteriaResponse(BaseModel):
    """Schema for acceptance criteria API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    backlogId: int = Field(alias="backlog_id")
    title: str
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class AcceptanceCriteriaListResponse(BaseModel):
    """Schema for paginated acceptance criteria list responses."""
    acceptanceCriteria: list[AcceptanceCriteriaResponse]
    total: int
    page: int
    pages: int 