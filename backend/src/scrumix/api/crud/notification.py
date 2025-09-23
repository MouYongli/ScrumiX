"""
CRUD operations for notifications
"""
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func, text
from datetime import datetime, timedelta

from .base import CRUDBase
from ..models.notification import Notification, UserNotification, NotificationType, NotificationPriority, NotificationStatus
from ..schemas.notification import (
    NotificationCreate, 
    NotificationUpdate, 
    UserNotificationCreate,
    UserNotificationUpdate,
    NotificationFeedFilter
)


class NotificationCRUD(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    """CRUD operations for notifications"""
    
    def create_with_recipients(
        self, 
        db: Session, 
        obj_in: NotificationCreate,
        created_by_id: Optional[int] = None
    ) -> Notification:
        """Create a notification and send it to specified recipients"""
        # Extract recipient IDs before creating notification
        recipient_ids = obj_in.recipient_user_ids
        
        # Create notification data without recipient_user_ids field
        notification_data = obj_in.model_dump(exclude={"recipient_user_ids"})
        if created_by_id:
            notification_data["created_by_id"] = created_by_id
        
        # Create the notification
        notification = self.create(db=db, obj_in=notification_data)
        
        # Create user notifications for each recipient
        for user_id in recipient_ids:
            user_notification = UserNotification(
                user_id=user_id,
                notification_id=notification.id
            )
            db.add(user_notification)
        
        db.commit()
        db.refresh(notification)
        return notification
    
    def broadcast_to_project_members(
        self,
        db: Session,
        project_id: int,
        notification_data: Dict[str, Any],
        created_by_id: Optional[int] = None,
        exclude_user_ids: Optional[List[int]] = None
    ) -> Notification:
        """Broadcast notification to all members of a project"""
        exclude_user_ids = exclude_user_ids or []
        
        # Get all project members
        from ..models.user_project import UserProject
        query = db.query(UserProject.user_id).filter(UserProject.project_id == project_id)
        if exclude_user_ids:
            query = query.filter(~UserProject.user_id.in_(exclude_user_ids))
        
        member_ids = [row.user_id for row in query.all()]
        
        if not member_ids:
            raise ValueError("No project members found to notify")
        
        # Create notification with project members as recipients
        notification_data["recipient_user_ids"] = member_ids
        notification_data["project_id"] = project_id
        
        obj_in = NotificationCreate(**notification_data)
        return self.create_with_recipients(db, obj_in, created_by_id)
    
    def get_by_project(
        self,
        db: Session,
        project_id: int,
        skip: int = 0,
        limit: int = 100,
        notification_types: Optional[List[NotificationType]] = None
    ) -> List[Notification]:
        """Get notifications for a specific project"""
        query = db.query(self.model).filter(self.model.project_id == project_id)
        
        if notification_types:
            query = query.filter(self.model.notification_type.in_(notification_types))
        
        return query.order_by(desc(self.model.created_at)).offset(skip).limit(limit).all()
    
    def get_expired_notifications(self, db: Session) -> List[Notification]:
        """Get all expired notifications"""
        now = datetime.utcnow()
        return db.query(self.model).filter(
            and_(
                self.model.expires_at.isnot(None),
                self.model.expires_at < now
            )
        ).all()
    
    def cleanup_expired_notifications(self, db: Session) -> int:
        """Delete expired notifications and return count deleted"""
        expired_notifications = self.get_expired_notifications(db)
        count = len(expired_notifications)
        
        for notification in expired_notifications:
            db.delete(notification)
        
        db.commit()
        return count


class UserNotificationCRUD(CRUDBase[UserNotification, UserNotificationCreate, UserNotificationUpdate]):
    """CRUD operations for user notifications"""
    
    def get_user_feed(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        filters: Optional[NotificationFeedFilter] = None
    ) -> Tuple[List[UserNotification], int]:
        """Get user's notification feed with filtering and pagination"""
        query = db.query(self.model).options(
            joinedload(self.model.notification)
        ).filter(self.model.user_id == user_id)
        
        # Apply filters
        if filters:
            if filters.statuses:
                query = query.filter(self.model.status.in_(filters.statuses))
            
            if filters.notification_types:
                query = query.join(Notification).filter(
                    Notification.notification_type.in_(filters.notification_types)
                )
            
            if filters.priorities:
                query = query.join(Notification).filter(
                    Notification.priority.in_(filters.priorities)
                )
            
            if filters.project_id:
                query = query.join(Notification).filter(
                    Notification.project_id == filters.project_id
                )
            
            if not filters.include_expired:
                # Exclude expired notifications
                now = datetime.utcnow()
                query = query.join(Notification).filter(
                    or_(
                        Notification.expires_at.is_(None),
                        Notification.expires_at > now
                    )
                )
            
            if filters.days_back:
                cutoff_date = datetime.utcnow() - timedelta(days=filters.days_back)
                query = query.filter(self.model.created_at >= cutoff_date)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination and ordering
        notifications = query.order_by(
            desc(self.model.created_at)
        ).offset(skip).limit(limit).all()
        
        return notifications, total
    
    def get_unread_count(self, db: Session, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.status == NotificationStatus.UNREAD
            )
        ).count()
    
    def mark_as_read(self, db: Session, user_id: int, notification_id: int) -> bool:
        """Mark a specific notification as read for a user"""
        user_notification = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.notification_id == notification_id
            )
        ).first()
        
        if user_notification and user_notification.status == NotificationStatus.UNREAD:
            user_notification.status = NotificationStatus.READ
            user_notification.read_at = datetime.utcnow()
            db.commit()
            return True
        return False
    
    def mark_as_dismissed(self, db: Session, user_id: int, notification_id: int) -> bool:
        """Mark a specific notification as dismissed for a user"""
        user_notification = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.notification_id == notification_id
            )
        ).first()
        
        if user_notification:
            user_notification.status = NotificationStatus.DISMISSED
            user_notification.dismissed_at = datetime.utcnow()
            if not user_notification.read_at:
                user_notification.read_at = datetime.utcnow()
            db.commit()
            return True
        return False
    
    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """Mark all unread notifications as read for a user"""
        now = datetime.utcnow()
        result = db.execute(
            text("""
                UPDATE user_notifications 
                SET status = :read_status, read_at = :now 
                WHERE user_id = :user_id AND status = :unread_status
            """),
            {
                "read_status": NotificationStatus.READ.value,
                "unread_status": NotificationStatus.UNREAD.value,
                "user_id": user_id,
                "now": now
            }
        )
        db.commit()
        return result.rowcount
    
    def bulk_update_status(
        self,
        db: Session,
        user_id: int,
        notification_ids: List[int],
        status: NotificationStatus
    ) -> int:
        """Bulk update status for multiple notifications"""
        now = datetime.utcnow()
        
        update_data = {"status": status}
        if status == NotificationStatus.READ:
            update_data["read_at"] = now
        elif status == NotificationStatus.DISMISSED:
            update_data["dismissed_at"] = now
            update_data["read_at"] = now
        
        result = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.notification_id.in_(notification_ids)
            )
        ).update(update_data, synchronize_session=False)
        
        db.commit()
        return result
    
    def get_user_notification_stats(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get notification statistics for a user"""
        # Get counts by status
        status_counts = db.query(
            self.model.status,
            func.count(self.model.id)
        ).filter(self.model.user_id == user_id).group_by(self.model.status).all()
        
        status_dict = {status.value: count for status, count in status_counts}
        
        # Get counts by type (join with notifications)
        type_counts = db.query(
            Notification.notification_type,
            func.count(self.model.id)
        ).join(
            Notification, self.model.notification_id == Notification.id
        ).filter(self.model.user_id == user_id).group_by(
            Notification.notification_type
        ).all()
        
        type_dict = {ntype.value: count for ntype, count in type_counts}
        
        # Get counts by priority
        priority_counts = db.query(
            Notification.priority,
            func.count(self.model.id)
        ).join(
            Notification, self.model.notification_id == Notification.id
        ).filter(self.model.user_id == user_id).group_by(
            Notification.priority
        ).all()
        
        priority_dict = {priority.value: count for priority, count in priority_counts}
        
        # Get recent activity (last 5 notifications)
        recent_notifications = db.query(self.model).options(
            joinedload(self.model.notification)
        ).filter(self.model.user_id == user_id).order_by(
            desc(self.model.created_at)
        ).limit(5).all()
        
        recent_activity = [
            {
                "id": un.notification.id,
                "title": un.notification.title,
                "type": un.notification.notification_type.value,
                "status": un.status.value,
                "created_at": un.created_at.isoformat()
            }
            for un in recent_notifications
        ]
        
        return {
            "total_notifications": sum(status_dict.values()),
            "unread_count": status_dict.get("unread", 0),
            "read_count": status_dict.get("read", 0),
            "dismissed_count": status_dict.get("dismissed", 0),
            "counts_by_type": type_dict,
            "counts_by_priority": priority_dict,
            "recent_activity": recent_activity
        }


# Create global instances
notification_crud = NotificationCRUD(Notification)
user_notification_crud = UserNotificationCRUD(UserNotification)
