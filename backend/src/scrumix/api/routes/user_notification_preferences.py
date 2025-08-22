"""
User notification preference API routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status as fastapi_status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..core.security import get_current_user_hybrid
from ..models.user import User
from ..models.user_notification_preference import DeliveryChannel
from ..crud.user_notification_preference import user_notification_preference_crud
from ..schemas.user_notification_preference import (
    UserNotificationPreferenceResponse,
    NotificationPreferencesUpdate,
    NotificationPreferencesResponse
)

router = APIRouter(tags=["notification-preferences"])


@router.get("/", response_model=NotificationPreferencesResponse)
def get_user_notification_preferences(
    delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> NotificationPreferencesResponse:
    """Get user's notification preferences"""
    try:
        preferences_dict = user_notification_preference_crud.get_user_preferences_dict(
            db=db,
            user_id=current_user.id,
            delivery_channel=delivery_channel
        )
        
        return NotificationPreferencesResponse.from_preferences_dict(
            user_id=current_user.id,
            preferences=preferences_dict,
            delivery_channel=delivery_channel
        )
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notification preferences: {str(e)}"
        )


@router.put("/", response_model=NotificationPreferencesResponse)
def update_user_notification_preferences(
    preferences_update: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> NotificationPreferencesResponse:
    """Update user's notification preferences"""
    try:
        # Update preferences in bulk
        user_notification_preference_crud.bulk_set_preferences(
            db=db,
            user_id=current_user.id,
            preferences=preferences_update.preferences,
            delivery_channel=preferences_update.delivery_channel
        )
        
        # Return updated preferences
        updated_preferences = user_notification_preference_crud.get_user_preferences_dict(
            db=db,
            user_id=current_user.id,
            delivery_channel=preferences_update.delivery_channel
        )
        
        return NotificationPreferencesResponse.from_preferences_dict(
            user_id=current_user.id,
            preferences=updated_preferences,
            delivery_channel=preferences_update.delivery_channel
        )
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating notification preferences: {str(e)}"
        )


@router.get("/all", response_model=List[UserNotificationPreferenceResponse])
def get_all_user_notification_preferences(
    delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> List[UserNotificationPreferenceResponse]:
    """Get all user's notification preferences with detailed information"""
    try:
        preferences = user_notification_preference_crud.get_user_preferences(
            db=db,
            user_id=current_user.id,
            delivery_channel=delivery_channel
        )
        
        return [
            UserNotificationPreferenceResponse.model_validate(pref)
            for pref in preferences
        ]
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching detailed notification preferences: {str(e)}"
        )


@router.post("/initialize", response_model=NotificationPreferencesResponse)
def initialize_user_notification_preferences(
    delivery_channel: DeliveryChannel = DeliveryChannel.IN_APP,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> NotificationPreferencesResponse:
    """Initialize default notification preferences for a user"""
    try:
        # Initialize default preferences
        user_notification_preference_crud.initialize_default_preferences(
            db=db,
            user_id=current_user.id,
            delivery_channel=delivery_channel
        )
        
        # Return the initialized preferences
        preferences_dict = user_notification_preference_crud.get_user_preferences_dict(
            db=db,
            user_id=current_user.id,
            delivery_channel=delivery_channel
        )
        
        return NotificationPreferencesResponse.from_preferences_dict(
            user_id=current_user.id,
            preferences=preferences_dict,
            delivery_channel=delivery_channel
        )
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing notification preferences: {str(e)}"
        )
