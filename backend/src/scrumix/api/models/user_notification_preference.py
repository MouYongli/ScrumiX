"""
User notification preference model for managing notification settings per user
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from scrumix.api.db.base import Base


class NotificationCategory(str, Enum):
    """Notification category enumeration"""
    MEETING_REMINDERS = "meeting_reminders"
    DOCUMENTATION_REMINDERS = "documentation_reminders"
    PROJECT_UPDATES = "project_updates"
    DEADLINE_REMINDERS = "deadline_reminders"


class DeliveryChannel(str, Enum):
    """Delivery channel enumeration"""
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"


class UserNotificationPreference(Base):
    """User notification preference model for storing user-specific notification settings."""
    
    __tablename__ = "user_notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(SQLEnum(NotificationCategory), nullable=False, index=True)
    delivery_channel = Column(SQLEnum(DeliveryChannel), nullable=False, default=DeliveryChannel.IN_APP)
    is_enabled = Column(Boolean, nullable=False, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")
    
    def __repr__(self):
        return f"<UserNotificationPreference(user_id={self.user_id}, category='{self.category.value}', channel='{self.delivery_channel.value}', enabled={self.is_enabled})>"
    
    @property
    def preference_key(self) -> str:
        """Generate a unique key for this preference"""
        return f"{self.category.value}_{self.delivery_channel.value}"
