from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class MeetingActionItemBase(BaseModel):
    """Base meeting action item schema with common fields."""
    meeting_id: int = Field(..., gt=0, description="ID of the meeting this action item belongs to")
    title: str = Field(..., min_length=1, max_length=500, description="Action item title/description")
    due_date: Optional[datetime] = Field(None, description="Due date for the action item")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if not v or not v.strip():
            raise ValueError('Action item title cannot be empty')
        return v.strip()


class MeetingActionItemCreate(MeetingActionItemBase):
    """Schema for creating a new meeting action item."""
    pass


class MeetingActionItemUpdate(BaseModel):
    """Schema for updating an existing meeting action item."""
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Action item title/description")
    due_date: Optional[datetime] = Field(None, description="Due date for the action item")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Action item title cannot be empty')
        return v.strip() if v else v


class MeetingActionItemInDB(MeetingActionItemBase):
    """Schema for meeting action item stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    action_id: int
    created_at: datetime
    updated_at: datetime


class MeetingActionItemResponse(BaseModel):
    """Schema for meeting action item API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    actionId: int = Field(alias="action_id")
    meetingId: int = Field(alias="meeting_id")
    title: str
    dueDate: Optional[datetime] = Field(alias="due_date")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class MeetingActionItemListResponse(BaseModel):
    """Schema for paginated meeting action item list responses."""
    actionItems: list[MeetingActionItemResponse]
    total: int
    page: int
    pages: int 