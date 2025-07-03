from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field
from typing import Optional
from datetime import datetime, timedelta

from ..models.meeting import MeetingType


class MeetingBase(BaseModel):
    """Base meeting schema with common fields."""
    meeting_type: MeetingType = Field(MeetingType.team_meeting, description="Type of meeting")
    start_datetime: datetime = Field(..., description="Meeting start date and time")
    description: Optional[str] = Field(None, description="Meeting description or agenda")
    duration: int = Field(30, ge=5, le=480, description="Meeting duration in minutes (5-480)")
    location: Optional[str] = Field(None, max_length=200, description="Meeting location or virtual link")
    
    @field_validator('start_datetime')
    @classmethod
    def validate_start_datetime(cls, v):
        """Validate start datetime is not in the past."""
        if v < datetime.now():
            raise ValueError('Meeting start time cannot be in the past')
        return v
    
    @field_validator('duration')
    @classmethod
    def validate_duration(cls, v):
        """Validate duration is reasonable."""
        if v < 5:
            raise ValueError('Meeting duration must be at least 5 minutes')
        if v > 480:  # 8 hours
            raise ValueError('Meeting duration cannot exceed 8 hours')
        return v


class MeetingCreate(MeetingBase):
    """Schema for creating a new meeting."""
    pass


class MeetingUpdate(BaseModel):
    """Schema for updating an existing meeting."""
    meeting_type: Optional[MeetingType] = Field(None, description="Type of meeting")
    start_datetime: Optional[datetime] = Field(None, description="Meeting start date and time")
    description: Optional[str] = Field(None, description="Meeting description or agenda")
    duration: Optional[int] = Field(None, ge=5, le=480, description="Meeting duration in minutes")
    location: Optional[str] = Field(None, max_length=200, description="Meeting location or virtual link")
    
    @field_validator('start_datetime')
    @classmethod
    def validate_start_datetime(cls, v):
        """Validate start datetime is not in the past."""
        if v and v < datetime.now():
            raise ValueError('Meeting start time cannot be in the past')
        return v


class MeetingInDB(MeetingBase):
    """Schema for meeting stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    meeting_id: int
    created_at: datetime
    updated_at: datetime


class MeetingResponse(BaseModel):
    """Schema for meeting API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True)
    
    meetingId: int = Field(alias="meeting_id")
    meetingType: MeetingType = Field(alias="meeting_type")
    startDatetime: datetime = Field(alias="start_datetime")
    description: Optional[str]
    duration: int
    location: Optional[str]
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    @computed_field
    @property
    def endDatetime(self) -> datetime:
        """Calculate meeting end time."""
        return self.startDatetime + timedelta(minutes=self.duration)
    
    @computed_field
    @property
    def isUpcoming(self) -> bool:
        """Check if meeting is in the future."""
        return self.startDatetime > datetime.now()
    
    @computed_field
    @property
    def isOngoing(self) -> bool:
        """Check if meeting is currently happening."""
        now = datetime.now()
        return self.startDatetime <= now <= self.endDatetime
    
    @computed_field
    @property
    def durationFormatted(self) -> str:
        """Format duration as human-readable string."""
        hours = self.duration // 60
        minutes = self.duration % 60
        if hours > 0:
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
        return f"{minutes}m"


class MeetingListResponse(BaseModel):
    """Schema for paginated meeting list responses."""
    meetings: list[MeetingResponse]
    total: int
    page: int
    pages: int 