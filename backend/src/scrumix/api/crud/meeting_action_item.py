from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime

from .base import CRUDBase
from ..models.meeting_action_item import MeetingActionItem
from ..schemas.meeting_action_item import MeetingActionItemCreate, MeetingActionItemUpdate


class CRUDMeetingActionItem(CRUDBase[MeetingActionItem, MeetingActionItemCreate, MeetingActionItemUpdate]):
    """CRUD operations for MeetingActionItem."""
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        meeting_id: Optional[int] = None,
        search: Optional[str] = None,
        due_before: Optional[datetime] = None,
        due_after: Optional[datetime] = None
    ) -> tuple[List[MeetingActionItem], int]:
        """Get multiple meeting action items with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply meeting filter
        if meeting_id:
            query = query.filter(self.model.meeting_id == meeting_id)
        
        # Apply search filter
        if search:
            search_filter = self.model.title.ilike(f"%{search}%")
            query = query.filter(search_filter)
        
        # Apply due date filters
        if due_before:
            query = query.filter(self.model.due_date <= due_before)
        if due_after:
            query = query.filter(self.model.due_date >= due_after)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        action_items = query.order_by(self.model.due_date.asc().nulls_last(), self.model.action_id.asc()).offset(skip).limit(limit).all()
        
        return action_items, total
    
    def get_by_meeting_id(
        self,
        db: Session,
        *,
        meeting_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingActionItem]:
        """Get action items by meeting ID."""
        return (
            db.query(self.model)
            .filter(self.model.meeting_id == meeting_id)
            .order_by(self.model.due_date.asc().nulls_last(), self.model.action_id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def count_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Count action items for a specific meeting."""
        return db.query(self.model).filter(self.model.meeting_id == meeting_id).count()
    
    def search_action_items(
        self,
        db: Session,
        *,
        query: str,
        meeting_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingActionItem]:
        """Search action items by title."""
        search_filter = self.model.title.ilike(f"%{query}%")
        
        db_query = db.query(self.model).filter(search_filter)
        
        # Optionally filter by meeting_id
        if meeting_id:
            db_query = db_query.filter(self.model.meeting_id == meeting_id)
        
        return (
            db_query
            .order_by(self.model.due_date.asc().nulls_last(), self.model.action_id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def delete_all_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Delete all action items for a specific meeting."""
        count = db.query(self.model).filter(self.model.meeting_id == meeting_id).count()
        db.query(self.model).filter(self.model.meeting_id == meeting_id).delete()
        db.commit()
        return count


meeting_action_item = CRUDMeetingActionItem(MeetingActionItem) 