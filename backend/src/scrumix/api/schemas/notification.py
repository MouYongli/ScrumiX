"""
Notification-related Pydantic schemas
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from ..models.notification import NotificationType, NotificationPriority, NotificationStatus, DeliveryMethod


# Base schemas
class NotificationBase(BaseModel):
    """Base notification schema"""
    title: str = Field(..., min_length=1, max_length=255, description="Notification title")
    message: str = Field(..., min_length=1, description="Notification message content")
    notification_type: NotificationType = Field(..., description="Type of notification")
    priority: NotificationPriority = Field(NotificationPriority.MEDIUM, description="Notification priority")
    action_url: Optional[str] = Field(None, max_length=500, description="Deep link URL")
    action_text: Optional[str] = Field(None, max_length=100, description="Call-to-action text")
    expires_at: Optional[datetime] = Field(None, description="Expiration time for time-sensitive notifications")


class NotificationCreate(NotificationBase):
    """Schema for creating notifications"""
    # Entity relationships (at least one should be provided)
    project_id: Optional[int] = Field(None, gt=0, description="Related project ID")
    meeting_id: Optional[int] = Field(None, gt=0, description="Related meeting ID")
    backlog_item_id: Optional[int] = Field(None, gt=0, description="Related backlog item ID")
    sprint_id: Optional[int] = Field(None, gt=0, description="Related sprint ID")
    task_id: Optional[int] = Field(None, gt=0, description="Related task ID")
    
    # User IDs to send notification to
    recipient_user_ids: List[int] = Field(..., min_items=1, description="List of user IDs to receive notification")
    
    # Optional creator (defaults to current user in API)
    created_by_id: Optional[int] = Field(None, gt=0, description="ID of user who created notification")


class NotificationUpdate(BaseModel):
    """Schema for updating notifications"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = Field(None, min_length=1)
    priority: Optional[NotificationPriority] = None
    action_url: Optional[str] = Field(None, max_length=500)
    action_text: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None


class NotificationResponse(NotificationBase):
    """Schema for notification responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Entity relationships
    project_id: Optional[int] = None
    meeting_id: Optional[int] = None
    backlog_item_id: Optional[int] = None
    sprint_id: Optional[int] = None
    task_id: Optional[int] = None
    
    # Computed fields
    is_expired: bool = Field(default=False, description="Whether notification has expired")
    entity_url: str = Field(default="/", description="Auto-generated entity URL")


# User notification schemas
class UserNotificationBase(BaseModel):
    """Base user notification schema"""
    status: NotificationStatus = Field(NotificationStatus.UNREAD, description="Notification status")
    delivery_method: DeliveryMethod = Field(DeliveryMethod.IN_APP, description="Delivery method")


class UserNotificationCreate(UserNotificationBase):
    """Schema for creating user notifications"""
    user_id: int = Field(..., gt=0, description="User ID")
    notification_id: int = Field(..., gt=0, description="Notification ID")


class UserNotificationUpdate(BaseModel):
    """Schema for updating user notification status"""
    status: Optional[NotificationStatus] = None


class UserNotificationResponse(UserNotificationBase):
    """Schema for user notification responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    notification_id: int
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    created_at: datetime
    
    # Include full notification data
    notification: NotificationResponse


# Bulk operations
class NotificationBulkCreate(BaseModel):
    """Schema for bulk notification creation"""
    notifications: List[NotificationCreate] = Field(..., min_items=1, max_items=100)


class UserNotificationBulkUpdate(BaseModel):
    """Schema for bulk user notification updates"""
    notification_ids: List[int] = Field(..., min_items=1, description="List of notification IDs to update")
    status: NotificationStatus = Field(..., description="New status for all notifications")
    user_id: int = Field(..., gt=0, description="User ID")


# Feed and listing schemas
class NotificationFeedFilter(BaseModel):
    """Schema for notification feed filtering"""
    notification_types: Optional[List[NotificationType]] = Field(None, description="Filter by notification types")
    priorities: Optional[List[NotificationPriority]] = Field(None, description="Filter by priorities")
    statuses: Optional[List[NotificationStatus]] = Field(None, description="Filter by statuses")
    project_id: Optional[int] = Field(None, gt=0, description="Filter by project")
    include_expired: bool = Field(False, description="Include expired notifications")
    days_back: Optional[int] = Field(None, ge=1, le=365, description="Limit to notifications from N days back")


class NotificationFeedResponse(BaseModel):
    """Schema for notification feed responses"""
    notifications: List[UserNotificationResponse]
    total: int = Field(..., description="Total number of notifications")
    unread_count: int = Field(..., description="Number of unread notifications")
    page: int = Field(..., description="Current page number")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


class NotificationStatsResponse(BaseModel):
    """Schema for notification statistics"""
    total_notifications: int
    unread_count: int
    read_count: int
    dismissed_count: int
    counts_by_type: Dict[str, int]
    counts_by_priority: Dict[str, int]
    recent_activity: List[Dict[str, Any]]  # Last 5 notifications


# Broadcast notification schemas
class NotificationBroadcast(BaseModel):
    """Schema for broadcasting notifications to multiple users"""
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    notification_type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    action_url: Optional[str] = Field(None, max_length=500)
    action_text: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None
    
    # Broadcast targeting
    target_user_ids: Optional[List[int]] = Field(None, description="Specific user IDs (if not provided, broadcast to project members)")
    project_id: Optional[int] = Field(None, gt=0, description="Project to broadcast to (all members)")
    
    # Entity context
    meeting_id: Optional[int] = Field(None, gt=0)
    backlog_item_id: Optional[int] = Field(None, gt=0)
    sprint_id: Optional[int] = Field(None, gt=0)
    task_id: Optional[int] = Field(None, gt=0)


class NotificationPreferences(BaseModel):
    """Schema for user notification preferences"""
    email_notifications: bool = Field(True, description="Enable email notifications")
    push_notifications: bool = Field(True, description="Enable push notifications")
    
    # Notification type preferences
    task_notifications: bool = Field(True, description="Task-related notifications")
    meeting_notifications: bool = Field(True, description="Meeting-related notifications")
    sprint_notifications: bool = Field(True, description="Sprint-related notifications")
    mention_notifications: bool = Field(True, description="Mention notifications")
    system_notifications: bool = Field(True, description="System announcements")
    
    # Timing preferences
    quiet_hours_start: Optional[str] = Field(None, description="Quiet hours start time (HH:MM)")
    quiet_hours_end: Optional[str] = Field(None, description="Quiet hours end time (HH:MM)")
    timezone: str = Field("UTC", description="User timezone")
