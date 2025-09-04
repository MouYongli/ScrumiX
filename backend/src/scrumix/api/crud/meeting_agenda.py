from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .base import CRUDBase
from ..models.meeting_agenda import MeetingAgenda
from ..schemas.meeting_agenda import MeetingAgendaCreate, MeetingAgendaUpdate


class CRUDMeetingAgenda(CRUDBase[MeetingAgenda, MeetingAgendaCreate, MeetingAgendaUpdate]):
    """CRUD operations for MeetingAgenda."""
    
    def create(self, db: Session, *, obj_in: MeetingAgendaCreate) -> MeetingAgenda:
        """Create a new meeting agenda item with automatic order assignment."""
        obj_in_data = obj_in.model_dump()
        
        # If order_index is not provided or is 0, assign the next available order
        if obj_in_data.get('order_index', 0) == 0:
            max_order = db.query(db.func.max(self.model.order_index)).filter(
                self.model.meeting_id == obj_in_data['meeting_id']
            ).scalar() or 0
            obj_in_data['order_index'] = max_order + 1
        
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        meeting_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> tuple[List[MeetingAgenda], int]:
        """Get multiple meeting agenda items with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply meeting filter
        if meeting_id:
            query = query.filter(self.model.meeting_id == meeting_id)
        
        # Apply search filter
        if search:
            search_filter = self.model.title.ilike(f"%{search}%")
            query = query.filter(search_filter)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        agenda_items = query.order_by(self.model.order_index.asc(), self.model.id.asc()).offset(skip).limit(limit).all()
        
        return agenda_items, total
    
    def get_by_meeting_id(
        self,
        db: Session,
        *,
        meeting_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingAgenda]:
        """Get agenda items by meeting ID."""
        return (
            db.query(self.model)
            .filter(self.model.meeting_id == meeting_id)
            .order_by(self.model.order_index.asc(), self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def count_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Count agenda items for a specific meeting."""
        return db.query(self.model).filter(self.model.meeting_id == meeting_id).count()
    
    def search_agenda_items(
        self,
        db: Session,
        *,
        query: str,
        meeting_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingAgenda]:
        """Search agenda items by title."""
        search_filter = self.model.title.ilike(f"%{query}%")
        
        db_query = db.query(self.model).filter(search_filter)
        
        # Optionally filter by meeting_id
        if meeting_id:
            db_query = db_query.filter(self.model.meeting_id == meeting_id)
        
        return (
            db_query
            .order_by(self.model.order_index.asc(), self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_agenda_with_meeting_info(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingAgenda]:
        """Get agenda items with meeting information loaded."""
        return (
            db.query(self.model)
            .join(self.model.meeting)
            .order_by(self.model.meeting_id.asc(), self.model.order_index.asc(), self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def bulk_create_for_meeting(
        self,
        db: Session,
        *,
        meeting_id: int,
        agenda_titles: List[str]
    ) -> List[MeetingAgenda]:
        """Create multiple agenda items for a meeting with automatic ordering."""
        agenda_objects = []
        
        # Get the current maximum order for this meeting
        max_order = db.query(db.func.max(self.model.order_index)).filter(
            self.model.meeting_id == meeting_id
        ).scalar() or 0
        
        for idx, title in enumerate(agenda_titles):
            if title and title.strip():  # Only create if title is not empty
                agenda_create = MeetingAgendaCreate(
                    meeting_id=meeting_id,
                    title=title.strip(),
                    order_index=max_order + idx + 1
                )
                agenda_obj = self.create(db=db, obj_in=agenda_create)
                agenda_objects.append(agenda_obj)
        
        return agenda_objects
    
    def delete_all_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Delete all agenda items for a specific meeting."""
        count = db.query(self.model).filter(self.model.meeting_id == meeting_id).count()
        db.query(self.model).filter(self.model.meeting_id == meeting_id).delete()
        db.commit()
        return count
    
    def reorder_agenda_items(
        self,
        db: Session,
        *,
        agenda_ids: List[int]
    ) -> List[MeetingAgenda]:
        """Reorder agenda items by updating their order field."""
        agenda_items = []
        
        for new_order, agenda_id in enumerate(agenda_ids):
            agenda_obj = self.get(db=db, id=agenda_id)
            if agenda_obj:
                # Update the order_index field
                agenda_obj.order_index = new_order + 1  # Start from 1 instead of 0
                db.add(agenda_obj)
                agenda_items.append(agenda_obj)
        
        db.commit()
        
        # Refresh all objects to get updated data
        for item in agenda_items:
            db.refresh(item)
        
        return agenda_items
    
    def update_order(
        self,
        db: Session,
        *,
        agenda_id: int,
        new_order: int
    ) -> Optional[MeetingAgenda]:
        """Update the order of a specific agenda item."""
        agenda_obj = self.get(db=db, id=agenda_id)
        if not agenda_obj:
            return None
        
        old_order = agenda_obj.order_index
        meeting_id = agenda_obj.meeting_id
        
        # Update the target item's order
        agenda_obj.order_index = new_order
        db.add(agenda_obj)
        
        # Adjust other items' orders to maintain sequence
        if new_order > old_order:
            # Moving down: decrease order of items between old and new position
            items_to_update = db.query(self.model).filter(
                and_(
                    self.model.meeting_id == meeting_id,
                    self.model.order_index > old_order,
                    self.model.order_index <= new_order,
                    self.model.id != agenda_id
                )
            ).all()
            for item in items_to_update:
                item.order_index = item.order_index - 1
                db.add(item)
                
        elif new_order < old_order:
            # Moving up: increase order of items between new and old position
            items_to_update = db.query(self.model).filter(
                and_(
                    self.model.meeting_id == meeting_id,
                    self.model.order_index >= new_order,
                    self.model.order_index < old_order,
                    self.model.id != agenda_id
                )
            ).all()
            for item in items_to_update:
                item.order_index = item.order_index + 1
                db.add(item)
        
        db.commit()
        db.refresh(agenda_obj)
        return agenda_obj
    
    def get_next_order_for_meeting(self, db: Session, *, meeting_id: int) -> int:
        """Get the next available order number for a meeting."""
        max_order = db.query(db.func.max(self.model.order_index)).filter(
            self.model.meeting_id == meeting_id
        ).scalar() or 0
        return max_order + 1
    
    def get_upcoming_meeting_agendas(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingAgenda]:
        """Get agenda items for upcoming meetings."""
        from datetime import datetime
        return (
            db.query(self.model)
            .join(self.model.meeting)
            .filter(self.model.meeting.has(start_datetime__gt=datetime.now()))
            .order_by(self.model.meeting_id.asc(), self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )


meeting_agenda = CRUDMeetingAgenda(MeetingAgenda)
meeting_agenda_crud = CRUDMeetingAgenda(MeetingAgenda) 