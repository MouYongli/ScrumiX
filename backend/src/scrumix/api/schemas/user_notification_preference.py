"""
User notification preference Pydantic schemas
"""
from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from ..models.user_notification_preference import NotificationCategory, DeliveryChannel


class UserNotificationPreferenceBase(BaseModel):
    """Base notification preference schema"""
    category: NotificationCategory = Field(..., description="Notification category")
    delivery_channel: DeliveryChannel = Field(DeliveryChannel.IN_APP, description="Delivery channel")
    is_enabled: bool = Field(True, description="Whether this notification type is enabled")


class UserNotificationPreferenceCreate(UserNotificationPreferenceBase):
    """Schema for creating notification preferences"""
    user_id: int = Field(..., gt=0, description="User ID")


class UserNotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences"""
    is_enabled: Optional[bool] = Field(None, description="Whether this notification type is enabled")


class UserNotificationPreferenceResponse(UserNotificationPreferenceBase):
    """Schema for notification preference responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class NotificationPreferencesUpdate(BaseModel):
    """Schema for bulk updating notification preferences"""
    preferences: Dict[str, bool] = Field(..., description="Dictionary of notification categories and their enabled status")
    delivery_channel: DeliveryChannel = Field(DeliveryChannel.IN_APP, description="Delivery channel")


class NotificationPreferencesResponse(BaseModel):
    """Schema for notification preferences response"""
    user_id: int
    delivery_channel: DeliveryChannel
    preferences: Dict[str, bool] = Field(..., description="Dictionary of notification categories and their enabled status")
    
    # Specific preference fields for easy frontend consumption
    meeting_reminders: bool = Field(..., description="Meeting reminder notifications")
    documentation_reminders: bool = Field(..., description="Documentation reminder notifications")
    project_updates: bool = Field(..., description="Project update notifications")
    deadline_reminders: bool = Field(..., description="Deadline reminder notifications")
    
    @classmethod
    def from_preferences_dict(
        cls,
        user_id: int,
        preferences: Dict[str, bool],
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ):
        """Create response from preferences dictionary"""
        return cls(
            user_id=user_id,
            delivery_channel=delivery_channel,
            preferences=preferences,
            meeting_reminders=preferences.get('meeting_reminders', True),
            documentation_reminders=preferences.get('documentation_reminders', True),
            project_updates=preferences.get('project_updates', True),
            deadline_reminders=preferences.get('deadline_reminders', True),
        )
