"""
Notification API routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as fastapi_status
from sqlalchemy.orm import Session
import math

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..models.notification import NotificationStatus, NotificationType, NotificationPriority
from ..schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationBroadcast,
    UserNotificationUpdate,
    UserNotificationResponse,
    NotificationFeedResponse,
    NotificationFeedFilter,
    NotificationStatsResponse,
    UserNotificationBulkUpdate
)
from ..crud.notification import notification_crud, user_notification_crud
from ..crud.project import project_crud
from ..crud.user_project import user_project_crud

router = APIRouter()


# User notification feed endpoints
@router.get("/feed", response_model=NotificationFeedResponse)
def get_notification_feed(
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return"),
    notification_types: Optional[List[NotificationType]] = Query(None, description="Filter by notification types"),
    priorities: Optional[List[NotificationPriority]] = Query(None, description="Filter by priorities"),
    statuses: Optional[List[NotificationStatus]] = Query(None, description="Filter by statuses"),
    project_id: Optional[int] = Query(None, description="Filter by project"),
    include_expired: bool = Query(False, description="Include expired notifications"),
    days_back: Optional[int] = Query(None, ge=1, le=365, description="Limit to notifications from N days back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notification feed with filtering and pagination"""
    filters = NotificationFeedFilter(
        notification_types=notification_types,
        priorities=priorities,
        statuses=statuses,
        project_id=project_id,
        include_expired=include_expired,
        days_back=days_back
    )
    
    notifications, total = user_notification_crud.get_user_feed(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        filters=filters
    )
    
    # Calculate pagination info
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    has_next = skip + limit < total
    has_previous = skip > 0
    
    # Get unread count
    unread_count = user_notification_crud.get_unread_count(db=db, user_id=current_user.id)
    
    return NotificationFeedResponse(
        notifications=[UserNotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
        page=current_page,
        pages=pages,
        has_next=has_next,
        has_previous=has_previous
    )


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications for current user"""
    count = user_notification_crud.get_unread_count(db=db, user_id=current_user.id)
    return {"unread_count": count}


@router.get("/stats", response_model=NotificationStatsResponse)
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification statistics for current user"""
    stats = user_notification_crud.get_user_notification_stats(db=db, user_id=current_user.id)
    return NotificationStatsResponse(**stats)


# Individual notification management
@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read"""
    success = user_notification_crud.mark_as_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id
    )
    
    if not success:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Notification not found or already read"
        )
    
    return {"message": "Notification marked as read"}


@router.put("/{notification_id}/dismiss")
def dismiss_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dismiss a specific notification"""
    success = user_notification_crud.mark_as_dismissed(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id
    )
    
    if not success:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification dismissed"}


# Bulk operations
@router.put("/mark-all-read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all unread notifications as read for current user"""
    count = user_notification_crud.mark_all_as_read(db=db, user_id=current_user.id)
    return {"message": f"Marked {count} notifications as read"}


@router.put("/bulk-update")
def bulk_update_notifications(
    bulk_update: UserNotificationBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk update status for multiple notifications"""
    if bulk_update.user_id != current_user.id:
        raise HTTPException(
            status_code=fastapi_status.HTTP_403_FORBIDDEN,
            detail="Can only update your own notifications"
        )
    
    count = user_notification_crud.bulk_update_status(
        db=db,
        user_id=current_user.id,
        notification_ids=bulk_update.notification_ids,
        status=bulk_update.status
    )
    
    return {"message": f"Updated {count} notifications"}


# Admin/System notification management
@router.post("/", response_model=NotificationResponse, status_code=fastapi_status.HTTP_201_CREATED)
def create_notification(
    notification_in: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new notification (requires appropriate permissions)"""
    # Verify that user has permission to create notifications
    # For now, allow all authenticated users, but in production you might want to restrict this
    
    notification = notification_crud.create_with_recipients(
        db=db,
        obj_in=notification_in,
        created_by_id=current_user.id
    )
    
    return NotificationResponse.model_validate(notification)


@router.post("/broadcast", response_model=NotificationResponse, status_code=fastapi_status.HTTP_201_CREATED)
def broadcast_notification(
    broadcast_data: NotificationBroadcast,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Broadcast notification to project members or specific users"""
    
    if broadcast_data.target_user_ids:
        # Send to specific users
        notification_data = broadcast_data.model_dump(exclude={"target_user_ids", "project_id"})
        notification_data["recipient_user_ids"] = broadcast_data.target_user_ids
        obj_in = NotificationCreate(**notification_data)
        notification = notification_crud.create_with_recipients(
            db=db,
            obj_in=obj_in,
            created_by_id=current_user.id
        )
    elif broadcast_data.project_id:
        # Verify user has access to the project
        user_project = user_project_crud.get_by_user_and_project(
            db=db,
            user_id=current_user.id,
            project_id=broadcast_data.project_id
        )
        if not user_project:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="No access to this project"
            )
        
        # Broadcast to all project members
        notification_data = broadcast_data.model_dump(exclude={"target_user_ids", "project_id"})
        notification = notification_crud.broadcast_to_project_members(
            db=db,
            project_id=broadcast_data.project_id,
            notification_data=notification_data,
            created_by_id=current_user.id,
            exclude_user_ids=[current_user.id]  # Don't notify the creator
        )
    else:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Must specify either target_user_ids or project_id"
        )
    
    return NotificationResponse.model_validate(notification)


@router.get("/project/{project_id}", response_model=List[NotificationResponse])
def get_project_notifications(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    notification_types: Optional[List[NotificationType]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notifications for a specific project (admin/project manager only)"""
    # Verify user has access to the project
    user_project = user_project_crud.get_by_user_and_project(
        db=db,
        user_id=current_user.id,
        project_id=project_id
    )
    if not user_project:
        raise HTTPException(
            status_code=fastapi_status.HTTP_403_FORBIDDEN,
            detail="No access to this project"
        )
    
    notifications = notification_crud.get_by_project(
        db=db,
        project_id=project_id,
        skip=skip,
        limit=limit,
        notification_types=notification_types
    )
    
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification (admin only or creator)"""
    notification = notification_crud.get(db=db, id=notification_id)
    if not notification:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check if user can delete (creator or admin)
    if notification.created_by_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=fastapi_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this notification"
        )
    
    notification_crud.remove(db=db, id=notification_id)
    return {"message": "Notification deleted"}


@router.post("/cleanup-expired")
def cleanup_expired_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up expired notifications (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=fastapi_status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    count = notification_crud.cleanup_expired_notifications(db=db)
    return {"message": f"Cleaned up {count} expired notifications"}
