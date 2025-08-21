"""
Notification-related database models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base


class NotificationType(str, Enum):
    """Notification type enumeration for different notification categories"""
    TASK_ASSIGNED = "task_assigned"
    TASK_STATUS_CHANGED = "task_status_changed"
    TASK_DEADLINE_APPROACHING = "task_deadline_approaching"
    MEETING_CREATED = "meeting_created"
    MEETING_REMINDER = "meeting_reminder"
    MEETING_UPDATED = "meeting_updated"
    MEETING_CANCELLED = "meeting_cancelled"
    SPRINT_STARTED = "sprint_started"
    SPRINT_COMPLETED = "sprint_completed"
    SPRINT_UPDATED = "sprint_updated"
    SPRINT_ENDING = "sprint_ending"
    BACKLOG_CREATED = "backlog_created"
    BACKLOG_UPDATED = "backlog_updated"
    BACKLOG_ASSIGNED = "backlog_assigned"
    DOCUMENTATION_ADDED = "documentation_added"
    PROJECT_MEMBER_ADDED = "project_member_added"
    PROJECT_MEMBER_REMOVED = "project_member_removed"
    PROJECT_STATUS_CHANGED = "project_status_changed"
    MENTION = "mention"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    DEADLINE_APPROACHING = "deadline_approaching"


class NotificationPriority(str, Enum):
    """Notification priority enumeration"""
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"


class NotificationStatus(str, Enum):
    """User notification status enumeration"""
    UNREAD = "unread"
    READ = "read"
    DISMISSED = "dismissed"


class DeliveryMethod(str, Enum):
    """Notification delivery method enumeration"""
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"


class Notification(Base):
    """Notification model for storing notification information."""
    
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    message = Column(Text, nullable=False)
    notification_type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    priority = Column(SQLEnum(NotificationPriority), nullable=False, default=NotificationPriority.MEDIUM, index=True)
    
    # Action-related fields for deep linking and CTAs
    action_url = Column(String(500), nullable=True)  # Deep link to relevant entity
    action_text = Column(String(100), nullable=True)  # "View Task", "Join Meeting", etc.
    
    # Expiration for time-sensitive notifications
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Who created this notification (system notifications have created_by_id = NULL)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Entity relationship fields (nullable, at least one should be set)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True, index=True)
    backlog_item_id = Column(Integer, ForeignKey("backlogs.id"), nullable=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_notifications")
    project = relationship("Project", foreign_keys=[project_id], backref="notifications")
    meeting = relationship("Meeting", foreign_keys=[meeting_id], backref="notifications") 
    backlog_item = relationship("Backlog", foreign_keys=[backlog_item_id], backref="notifications")
    sprint = relationship("Sprint", foreign_keys=[sprint_id], backref="notifications")
    task = relationship("Task", foreign_keys=[task_id], backref="notifications")
    
    # User notification associations
    user_notifications = relationship("UserNotification", back_populates="notification", cascade="all, delete-orphan")
    
    # Composite indexes for common query patterns
    __table_args__ = (
        # Index for project + type + priority queries
        Index('idx_notification_project_type_priority', 'project_id', 'notification_type', 'priority'),
        
        # Index for type + status + creation time (for notification feeds)
        Index('idx_notification_type_created', 'notification_type', 'created_at'),
        
        # Index for priority + creation time (for urgent notifications)
        Index('idx_notification_priority_created', 'priority', 'created_at'),
        
        # Index for expiration queries
        Index('idx_notification_expires_at', 'expires_at'),
        
        # Index for creator queries
        Index('idx_notification_created_by', 'created_by_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Notification(id={self.id}, type='{self.notification_type.value}', title='{self.title}')>"
    
    @property
    def is_expired(self) -> bool:
        """Check if notification has expired"""
        if not self.expires_at:
            return False
        from datetime import datetime
        return datetime.utcnow() > self.expires_at
    
    @property
    def entity_url(self) -> str:
        """Generate entity-specific URL based on related entities"""
        if self.task_id:
            return f"/project/{self.project_id}/task/{self.task_id}"
        elif self.meeting_id:
            return f"/project/{self.project_id}/meeting/{self.meeting_id}"
        elif self.sprint_id:
            return f"/project/{self.project_id}/sprint/{self.sprint_id}"
        elif self.backlog_item_id:
            return f"/project/{self.project_id}/backlog/{self.backlog_item_id}"
        elif self.project_id:
            return f"/project/{self.project_id}"
        return "/"


class UserNotification(Base):
    """Association table for User-Notification many-to-many relationship with status tracking"""
    
    __tablename__ = "user_notifications"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False, index=True)
    
    # Status tracking
    status = Column(SQLEnum(NotificationStatus), nullable=False, default=NotificationStatus.UNREAD, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery method tracking for future multi-channel support
    delivery_method = Column(SQLEnum(DeliveryMethod), nullable=False, default=DeliveryMethod.IN_APP)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="user_notifications")
    notification = relationship("Notification", back_populates="user_notifications")
    
    # Composite indexes for efficient queries
    __table_args__ = (
        # Unique constraint to prevent duplicate user-notification pairs
        Index('idx_user_notification_unique', 'user_id', 'notification_id', unique=True),
        
        # Index for user's notification feed queries
        Index('idx_user_notification_feed', 'user_id', 'status', 'created_at'),
        
        # Index for unread notifications count
        Index('idx_user_notification_unread', 'user_id', 'status'),
        
        # Index for notification delivery tracking
        Index('idx_user_notification_delivery', 'delivery_method', 'status'),
    )
    
    def __repr__(self):
        return f"<UserNotification(user_id={self.user_id}, notification_id={self.notification_id}, status='{self.status.value}')>"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if self.status == NotificationStatus.UNREAD:
            self.status = NotificationStatus.READ
            self.read_at = func.now()
    
    def mark_as_dismissed(self):
        """Mark notification as dismissed"""
        self.status = NotificationStatus.DISMISSED
        self.dismissed_at = func.now()
        if not self.read_at:
            self.read_at = func.now()
