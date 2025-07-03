from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime


class MeetingNoteBase(BaseModel):
    """Base meeting note schema with common fields."""
    meeting_id: int = Field(..., gt=0, description="ID of the meeting this note belongs to")
    content: str = Field(..., min_length=1, description="Note content")
    parent_note_id: Optional[int] = Field(None, description="ID of parent note for hierarchical structure")
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        """Validate content is not empty and properly formatted."""
        if not v or not v.strip():
            raise ValueError('Note content cannot be empty')
        return v.strip()


class MeetingNoteCreate(MeetingNoteBase):
    """Schema for creating a new meeting note."""
    pass


class MeetingNoteUpdate(BaseModel):
    """Schema for updating an existing meeting note."""
    content: Optional[str] = Field(None, min_length=1, description="Note content")
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        """Validate content is not empty and properly formatted."""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Note content cannot be empty')
        return v.strip() if v else v


class MeetingNoteInDB(MeetingNoteBase):
    """Schema for meeting note stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    note_id: int
    created_at: datetime
    updated_at: datetime


class MeetingNoteResponse(BaseModel):
    """Schema for meeting note API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    noteId: int = Field(alias="note_id")
    meetingId: int = Field(alias="meeting_id")
    content: str
    parentNoteId: Optional[int] = Field(alias="parent_note_id")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    # Optional field for nested notes
    childNotes: Optional[List["MeetingNoteResponse"]] = Field(default=None, description="Child notes for hierarchical display")


class MeetingNoteListResponse(BaseModel):
    """Schema for paginated meeting note list responses."""
    notes: list[MeetingNoteResponse]
    total: int
    page: int
    pages: int


class MeetingNoteTreeResponse(BaseModel):
    """Schema for hierarchical meeting note tree responses."""
    notes: list[MeetingNoteResponse]
    total: int
    topLevelCount: int


# Update forward reference for recursive model
MeetingNoteResponse.model_rebuild() 