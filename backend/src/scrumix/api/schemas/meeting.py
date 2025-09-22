from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field, field_serializer
from typing import Optional
from datetime import datetime, timedelta

from ..models.meeting import MeetingType


class MeetingBase(BaseModel):
    """Base meeting schema with common fields."""
    title: str = Field(..., min_length=1, max_length=200, description="Meeting title")
    meeting_type: MeetingType = Field(MeetingType.TEAM_MEETING, description="Type of meeting")
    start_datetime: datetime = Field(..., description="Meeting start date and time")
    description: Optional[str] = Field(None, description="Meeting description")
    duration: int = Field(30, gt=0, le=480, description="Meeting duration in minutes")
    location: Optional[str] = Field(None, description="Meeting location or virtual link")
    sprint_id: Optional[int] = Field(None, gt=0, description="ID of the sprint this meeting belongs to (optional)")
    project_id: int = Field(..., gt=0, description="ID of the project this meeting belongs to")
    
    @field_validator('start_datetime')
    @classmethod
    def validate_start_datetime(cls, v):
        """Validate start datetime is not in the past."""
        if v:
            from datetime import timezone
            # Convert to timezone-aware datetime for comparison
            now = datetime.now(timezone.utc)
            # Ensure v is timezone-aware for comparison
            if v.tzinfo is None:
                # If naive, assume it's in UTC
                v_aware = v.replace(tzinfo=timezone.utc)
            else:
                v_aware = v
            if v_aware < now:
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
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Meeting title")
    meeting_type: Optional[MeetingType] = Field(None, description="Type of meeting")
    start_datetime: Optional[datetime] = Field(None, description="Meeting start date and time")
    description: Optional[str] = Field(None, description="Meeting description or agenda")
    duration: Optional[int] = Field(None, ge=5, le=480, description="Meeting duration in minutes")
    location: Optional[str] = Field(None, max_length=200, description="Meeting location or virtual link")
    sprint_id: Optional[int] = Field(None, gt=0, description="ID of the sprint this meeting belongs to")
    project_id: Optional[int] = Field(None, gt=0, description="ID of the project this meeting belongs to")
    
    @field_validator('start_datetime')
    @classmethod
    def validate_start_datetime(cls, v):
        """Validate start datetime is not in the past."""
        if v:
            from datetime import timezone
            # Convert to timezone-aware datetime for comparison
            now = datetime.now(timezone.utc)
            # Ensure v is timezone-aware for comparison
            if v.tzinfo is None:
                # If naive, assume it's in UTC
                v_aware = v.replace(tzinfo=timezone.utc)
            else:
                v_aware = v
            if v_aware < now:
                raise ValueError('Meeting start time cannot be in the past')
        return v
    
    class Config:
        exclude_unset = True


class MeetingInDB(MeetingBase):
    """Schema for meeting stored in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime


class MeetingResponse(BaseModel):
    """Schema for meeting API responses with frontend field aliasing."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    title: str
    meetingType: MeetingType = Field(alias="meeting_type", serialization_alias="meetingType")
    startDatetime: datetime = Field(alias="start_datetime", serialization_alias="startDatetime")
    description: Optional[str]
    duration: int
    location: Optional[str]
    sprintId: Optional[int] = Field(alias="sprint_id", serialization_alias="sprintId")
    projectId: int = Field(alias="project_id", serialization_alias="projectId")
    createdAt: datetime = Field(alias="created_at", serialization_alias="createdAt")
    updatedAt: datetime = Field(alias="updated_at", serialization_alias="updatedAt")
    
    @field_serializer('startDatetime', 'createdAt', 'updatedAt')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime fields to ISO format strings."""
        if value:
            return value.isoformat()
        return None
    
    @classmethod
    def from_orm(cls, obj):
        """Create response object from ORM model (for compatibility)"""
        return cls(
            id=obj.id,
            title=obj.title,
            meeting_type=obj.meeting_type,
            start_datetime=obj.start_datetime,
            description=obj.description,
            duration=obj.duration,
            location=obj.location,
            sprint_id=obj.sprint_id,
            project_id=obj.project_id,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )
    
    @computed_field
    @property
    def endDatetime(self) -> datetime:
        """Calculate meeting end time."""
        return self.startDatetime + timedelta(minutes=self.duration)
    
    @computed_field
    @property
    def isUpcoming(self) -> bool:
        """Check if meeting is in the future."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        # Ensure startDatetime is timezone-aware for comparison
        if self.startDatetime.tzinfo is None:
            # If naive, assume it's in UTC
            start_dt = self.startDatetime.replace(tzinfo=timezone.utc)
        else:
            start_dt = self.startDatetime
        return start_dt > now
    
    @computed_field
    @property
    def isOngoing(self) -> bool:
        """Check if meeting is currently happening."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        # Ensure both datetimes are timezone-aware for comparison
        if self.startDatetime.tzinfo is None:
            start_dt = self.startDatetime.replace(tzinfo=timezone.utc)
        else:
            start_dt = self.startDatetime
            
        if self.endDatetime.tzinfo is None:
            end_dt = self.endDatetime.replace(tzinfo=timezone.utc)
        else:
            end_dt = self.endDatetime
            
        return start_dt <= now <= end_dt
    
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