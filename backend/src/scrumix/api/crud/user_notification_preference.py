"""
User notification preference CRUD operations
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.sql import func

from .base import CRUDBase
from ..models.user_notification_preference import (
    UserNotificationPreference,
    NotificationCategory,
    DeliveryChannel
)
from ..schemas.user_notification_preference import (
    UserNotificationPreferenceCreate,
    UserNotificationPreferenceUpdate
)


class UserNotificationPreferenceCRUD(CRUDBase[UserNotificationPreference, UserNotificationPreferenceCreate, UserNotificationPreferenceUpdate]):
    """CRUD operations for user notification preferences"""
    
    def get_user_preferences(
        self,
        db: Session,
        user_id: int,
        delivery_channel: Optional[DeliveryChannel] = None
    ) -> List[UserNotificationPreference]:
        """Get all notification preferences for a user"""
        query = db.query(self.model).filter(self.model.user_id == user_id)
        
        if delivery_channel:
            query = query.filter(self.model.delivery_channel == delivery_channel)
        
        return query.all()
    
    def get_user_preference(
        self,
        db: Session,
        user_id: int,
        category: NotificationCategory,
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ) -> Optional[UserNotificationPreference]:
        """Get a specific notification preference for a user"""
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.category == category,
                self.model.delivery_channel == delivery_channel
            )
        ).first()
    
    def set_user_preference(
        self,
        db: Session,
        user_id: int,
        category: NotificationCategory,
        is_enabled: bool,
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ) -> UserNotificationPreference:
        """Set or update a user's notification preference"""
        existing = self.get_user_preference(db, user_id, category, delivery_channel)
        
        if existing:
            existing.is_enabled = is_enabled
            existing.updated_at = func.now()
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new preference
            preference_data = UserNotificationPreferenceCreate(
                user_id=user_id,
                category=category,
                delivery_channel=delivery_channel,
                is_enabled=is_enabled
            )
            return self.create(db, obj_in=preference_data)
    
    def bulk_set_preferences(
        self,
        db: Session,
        user_id: int,
        preferences: Dict[str, bool],
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ) -> List[UserNotificationPreference]:
        """Bulk set multiple preferences for a user"""
        results = []
        
        for category_str, is_enabled in preferences.items():
            try:
                category = NotificationCategory(category_str)
                preference = self.set_user_preference(
                    db, user_id, category, is_enabled, delivery_channel
                )
                results.append(preference)
            except ValueError:
                # Skip invalid category names
                continue
        
        return results
    
    def is_notification_enabled(
        self,
        db: Session,
        user_id: int,
        category: NotificationCategory,
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ) -> bool:
        """Check if a notification type is enabled for a user"""
        preference = self.get_user_preference(db, user_id, category, delivery_channel)
        print(f"          🔍 PREF DEBUG: User {user_id}, category {category.value}: preference = {preference}")
        
        if preference is None:
            print(f"          🔍 PREF DEBUG: No preference found, creating default preferences and returning enabled")
            # Initialize default preferences for this user if they don't exist
            try:
                self.initialize_default_preferences(db, user_id, delivery_channel)
                # After initializing, get the preference again
                preference = self.get_user_preference(db, user_id, category, delivery_channel)
                if preference:
                    return preference.is_enabled
            except Exception as e:
                print(f"          🔍 PREF DEBUG: Error initializing defaults: {e}")
            
            # Default to enabled if no preference is set and initialization failed
            return True
        
        print(f"          🔍 PREF DEBUG: Preference found, is_enabled = {preference.is_enabled}")
        return preference.is_enabled
    
    def should_send_notification(
        self,
        db: Session,
        user_id: int,
        notification_type: str,
        delivery_channel: str = "in_app"
    ) -> bool:
        """Check if a notification should be sent to a user based on their preferences"""
        try:
            print(f"        🔍 CRUD DEBUG: Checking user {user_id} for notification '{notification_type}'")
            
            # Map notification types to categories
            type_mapping = {
                'meeting_created': NotificationCategory.MEETING_REMINDERS,
                'meeting_reminder': NotificationCategory.MEETING_REMINDERS,
                'meeting_updated': NotificationCategory.MEETING_REMINDERS,
                'meeting_cancelled': NotificationCategory.MEETING_REMINDERS,
                'documentation_added': NotificationCategory.DOCUMENTATION_REMINDERS,
                'project_member_added': NotificationCategory.PROJECT_UPDATES,
                'project_member_removed': NotificationCategory.PROJECT_UPDATES,
                'project_status_changed': NotificationCategory.PROJECT_UPDATES,
                'project_name_changed': NotificationCategory.PROJECT_UPDATES,
                'project_updated': NotificationCategory.PROJECT_UPDATES,
                'deadline_approaching': NotificationCategory.DEADLINE_REMINDERS,
                'task_deadline_approaching': NotificationCategory.DEADLINE_REMINDERS,
                'sprint_deadline_approaching': NotificationCategory.DEADLINE_REMINDERS,
            }
            
            category = type_mapping.get(notification_type)
            print(f"        🔍 CRUD DEBUG: Notification type '{notification_type}' maps to category: {category.value if category else 'NONE'}")
            
            if not category:
                print(f"        🔍 CRUD DEBUG: Unknown notification type, defaulting to enabled")
                # Default to enabled for unknown types
                return True
            
            channel = DeliveryChannel(delivery_channel)
            is_enabled = self.is_notification_enabled(db, user_id, category, channel)
            print(f"        🔍 CRUD DEBUG: User {user_id} category {category.value} enabled: {is_enabled}")
            return is_enabled
            
        except (ValueError, KeyError) as e:
            print(f"        🔍 CRUD DEBUG: Error checking preferences: {e}, defaulting to enabled")
            # Default to enabled if there's any error
            return True
    
    def get_user_preferences_dict(
        self,
        db: Session,
        user_id: int,
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ) -> Dict[str, bool]:
        """Get user preferences as a dictionary for easy consumption"""
        preferences = self.get_user_preferences(db, user_id, delivery_channel)
        
        # Create a dictionary with all categories, defaulting to True
        result = {}
        for category in NotificationCategory:
            result[category.value] = True  # Default to enabled
        
        # Override with actual preferences
        for pref in preferences:
            result[pref.category.value] = pref.is_enabled
        
        return result
    
    def initialize_default_preferences(
        self,
        db: Session,
        user_id: int,
        delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP
    ) -> List[UserNotificationPreference]:
        """Initialize default notification preferences for a new user"""
        default_preferences = {
            NotificationCategory.MEETING_REMINDERS: True,
            NotificationCategory.DOCUMENTATION_REMINDERS: True,
            NotificationCategory.PROJECT_UPDATES: True,
            NotificationCategory.DEADLINE_REMINDERS: True,
        }
        
        results = []
        for category, is_enabled in default_preferences.items():
            preference = self.set_user_preference(
                db, user_id, category, is_enabled, delivery_channel
            )
            results.append(preference)
        
        return results


# Create singleton instance
user_notification_preference_crud = UserNotificationPreferenceCRUD(UserNotificationPreference)
