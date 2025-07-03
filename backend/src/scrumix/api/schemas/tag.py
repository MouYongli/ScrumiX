from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class TagBase(BaseModel):
    """Base tag schema with common fields."""
    title: str = Field(..., min_length=1, max_length=100, description="Tag title")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if not v or not v.strip():
            raise ValueError('Tag title cannot be empty')
        return v.strip()


class TagCreate(TagBase):
    """Schema for creating a new tag."""
    pass


class TagUpdate(BaseModel):
    """Schema for updating an existing tag."""
    title: Optional[str] = Field(None, min_length=1, max_length=100, description="Tag title")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Tag title cannot be empty')
        return v.strip() if v else v


class TagInDB(TagBase):
    """Schema for tag stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime


class TagResponse(BaseModel):
    """Schema for tag API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class TagListResponse(BaseModel):
    """Schema for paginated tag list responses."""
    tags: list[TagResponse]
    total: int
    page: int
    pages: int 