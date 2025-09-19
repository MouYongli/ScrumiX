from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional


class PersonalNoteBase(BaseModel):
    """Base schema for personal note with common fields."""
    note_date: date = Field(..., description="Date for the note (YYYY-MM-DD)")
    content: str = Field(..., min_length=1, max_length=1000, description="Note content")


class PersonalNoteCreate(PersonalNoteBase):
    """Schema for creating a new personal note."""
    pass


class PersonalNoteUpdate(BaseModel):
    """Schema for updating an existing personal note."""
    content: Optional[str] = Field(None, min_length=1, max_length=1000, description="Updated note content")


class PersonalNoteResponse(PersonalNoteBase):
    """Schema for personal note response with all fields."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
