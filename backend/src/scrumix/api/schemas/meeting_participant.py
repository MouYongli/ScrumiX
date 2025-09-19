"""
Pydantic schemas for MeetingParticipant
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from ..models.meeting_participant import MeetingParticipantRole


class MeetingParticipantBase(BaseModel):
    """Base schema for MeetingParticipant"""
    user_id: Optional[int] = Field(None, alias="userId", description="Internal user ID (null for external participants)")
    role: MeetingParticipantRole = Field(default=MeetingParticipantRole.GUEST, description="Participant's role in the meeting")
    external_name: Optional[str] = Field(None, alias="externalName", max_length=100, description="Name for external participants")
    external_email: Optional[str] = Field(None, alias="externalEmail", max_length=255, description="Email for external participants")


class MeetingParticipantCreate(MeetingParticipantBase):
    """Schema for creating a MeetingParticipant"""
    meeting_id: int = Field(..., alias="meetingId", gt=0, description="Meeting ID")


class MeetingParticipantUpdate(BaseModel):
    """Schema for updating a MeetingParticipant"""
    role: Optional[MeetingParticipantRole] = Field(None, description="Updated role in the meeting")
    external_name: Optional[str] = Field(None, alias="externalName", max_length=100, description="Updated external name")
    external_email: Optional[str] = Field(None, alias="externalEmail", max_length=255, description="Updated external email")


class MeetingParticipantResponse(MeetingParticipantBase):
    """Schema for MeetingParticipant response"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    meeting_id: int = Field(alias="meetingId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class MeetingParticipantWithUser(MeetingParticipantResponse):
    """Schema for MeetingParticipant response with user details"""
    # User details (will be None for external participants)
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = Field(None, alias="fullName")
    
    # Display name helper - computed field that shows appropriate name
    @property
    def display_name(self) -> str:
        """Get the display name for this participant"""
        if self.full_name:
            return self.full_name
        elif self.username:
            return self.username
        elif self.external_name:
            return self.external_name
        elif self.email:
            return self.email
        elif self.external_email:
            return self.external_email
        else:
            return "Unknown Participant"
    
    @property
    def display_email(self) -> Optional[str]:
        """Get the display email for this participant"""
        return self.email or self.external_email


class MeetingParticipantInDB(MeetingParticipantResponse):
    """Schema for MeetingParticipant in database"""
    pass


# Bulk operations schemas
class MeetingParticipantsRequest(BaseModel):
    """Schema for adding multiple participants to a meeting"""
    participants: List[dict] = Field(..., description="List of participant data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "participants": [
                    {
                        "user_id": 1,
                        "role": "developer"
                    },
                    {
                        "external_name": "John Doe",
                        "external_email": "john.doe@example.com",
                        "role": "guest"
                    }
                ]
            }
        }


class MeetingParticipantsResponse(BaseModel):
    """Schema for meeting participants response"""
    model_config = ConfigDict(populate_by_name=True)
    
    meeting_id: int = Field(alias="meetingId")
    participants: List[MeetingParticipantWithUser]
    total_count: int = Field(alias="totalCount")


class AddParticipantRequest(BaseModel):
    """Schema for adding a single participant"""
    user_id: Optional[int] = Field(None, description="Internal user ID")
    external_name: Optional[str] = Field(None, max_length=100, description="External participant name")
    external_email: Optional[str] = Field(None, max_length=255, description="External participant email")
    role: MeetingParticipantRole = Field(default=MeetingParticipantRole.GUEST, description="Participant role")
    
    def validate_participant_data(self) -> bool:
        """Validate that either user_id or external info is provided"""
        return bool(self.user_id or self.external_name or self.external_email)


class UpdateParticipantRoleRequest(BaseModel):
    """Schema for updating participant role"""
    role: MeetingParticipantRole = Field(..., description="New role for the participant")


class RemoveParticipantRequest(BaseModel):
    """Schema for removing a participant"""
    user_id: Optional[int] = Field(None, description="Internal user ID to remove")
    participant_id: Optional[int] = Field(None, description="Participant record ID to remove")
    
    def validate_removal_data(self) -> bool:
        """Validate that either user_id or participant_id is provided"""
        return bool(self.user_id or self.participant_id)
