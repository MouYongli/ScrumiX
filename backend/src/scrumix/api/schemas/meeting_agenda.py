from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class MeetingAgendaBase(BaseModel):
    """Base meeting agenda schema with common fields."""
    meeting_id: int = Field(..., gt=0, description="ID of the meeting this agenda item belongs to")
    title: str = Field(..., min_length=1, max_length=500, description="Agenda item title/description")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if not v or not v.strip():
            raise ValueError('Agenda item title cannot be empty')
        return v.strip()


class MeetingAgendaCreate(MeetingAgendaBase):
    """Schema for creating a new meeting agenda item."""
    pass


class MeetingAgendaUpdate(BaseModel):
    """Schema for updating an existing meeting agenda item."""
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Agenda item title/description")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate title is not empty and properly formatted."""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Agenda item title cannot be empty')
        return v.strip() if v else v


class MeetingAgendaInDB(MeetingAgendaBase):
    """Schema for meeting agenda stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(alias="agenda_id")
    created_at: datetime
    updated_at: datetime


class MeetingAgendaResponse(BaseModel):
    """Schema for meeting agenda API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    agendaId: int = Field(alias="id")
    meetingId: int = Field(alias="meeting_id")
    title: str
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class MeetingAgendaReorderRequest(BaseModel):
    """Schema for reordering meeting agenda items."""
    agenda_ids: list[int] = Field(..., min_items=1, description="List of agenda item IDs in the desired order")


class MeetingAgendaListResponse(BaseModel):
    """Schema for paginated meeting agenda list responses."""
    agendaItems: list[MeetingAgendaResponse]
    total: int
    page: int
    pages: int 