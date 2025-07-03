from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta

from .base import CRUDBase
from ..models.meeting import Meeting, MeetingType
from ..schemas.meeting import MeetingCreate, MeetingUpdate


class CRUDMeeting(CRUDBase[Meeting, MeetingCreate, MeetingUpdate]):
    """CRUD operations for Meeting."""
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        meeting_type: Optional[MeetingType] = None,
        search: Optional[str] = None,
        upcoming_only: bool = False,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> tuple[List[Meeting], int]:
        """Get multiple meetings with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply meeting type filter
        if meeting_type:
            query = query.filter(self.model.meeting_type == meeting_type)
        
        # Apply search filter
        if search:
            search_filter = or_(
                self.model.description.ilike(f"%{search}%"),
                self.model.location.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Apply upcoming only filter
        if upcoming_only:
            query = query.filter(self.model.start_datetime > datetime.now())
        
        # Apply date range filter
        if date_from:
            query = query.filter(self.model.start_datetime >= date_from)
        if date_to:
            query = query.filter(self.model.start_datetime <= date_to)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        meetings = query.order_by(self.model.start_datetime.asc()).offset(skip).limit(limit).all()
        
        return meetings, total
    
    def get_by_type(
        self,
        db: Session,
        *,
        meeting_type: MeetingType,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Get meetings by type."""
        return (
            db.query(self.model)
            .filter(self.model.meeting_type == meeting_type)
            .order_by(self.model.start_datetime.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_upcoming_meetings(
        self,
        db: Session,
        *,
        days_ahead: int = 7,
        limit: int = 100
    ) -> List[Meeting]:
        """Get upcoming meetings within specified days."""
        end_date = datetime.now() + timedelta(days=days_ahead)
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.start_datetime > datetime.now(),
                    self.model.start_datetime <= end_date
                )
            )
            .order_by(self.model.start_datetime.asc())
            .limit(limit)
            .all()
        )
    
    def get_today_meetings(self, db: Session) -> List[Meeting]:
        """Get today's meetings."""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.start_datetime >= today_start,
                    self.model.start_datetime < today_end
                )
            )
            .order_by(self.model.start_datetime.asc())
            .all()
        )
    
    def get_ongoing_meetings(self, db: Session) -> List[Meeting]:
        """Get currently ongoing meetings."""
        now = datetime.now()
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.start_datetime <= now,
                    func.datetime(
                        self.model.start_datetime, 
                        '+' + func.cast(self.model.duration, db.String) + ' minutes'
                    ) >= now
                )
            )
            .order_by(self.model.start_datetime.asc())
            .all()
        )
    
    def search_meetings(
        self,
        db: Session,
        *,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Search meetings by description and location."""
        search_filter = or_(
            self.model.description.ilike(f"%{query}%"),
            self.model.location.ilike(f"%{query}%")
        )
        
        return (
            db.query(self.model)
            .filter(search_filter)
            .order_by(self.model.start_datetime.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_meetings_by_date_range(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Get meetings within a date range."""
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.start_datetime >= start_date,
                    self.model.start_datetime <= end_date
                )
            )
            .order_by(self.model.start_datetime.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_meeting_statistics(self, db: Session) -> dict:
        """Get meeting statistics by type and time periods."""
        stats = {}
        
        # Count meetings by type
        for meeting_type in MeetingType:
            count = db.query(self.model).filter(self.model.meeting_type == meeting_type).count()
            stats[meeting_type.value] = count
        
        # Total meetings
        stats["total"] = db.query(self.model).count()
        
        # Upcoming meetings
        stats["upcoming"] = db.query(self.model).filter(
            self.model.start_datetime > datetime.now()
        ).count()
        
        # Today's meetings
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        stats["today"] = db.query(self.model).filter(
            and_(
                self.model.start_datetime >= today_start,
                self.model.start_datetime < today_end
            )
        ).count()
        
        return stats
    
    def reschedule_meeting(
        self,
        db: Session,
        *,
        meeting_id: int,
        new_start_datetime: datetime,
        new_duration: Optional[int] = None
    ) -> Optional[Meeting]:
        """Reschedule a meeting."""
        meeting = db.query(self.model).filter(self.model.meeting_id == meeting_id).first()
        if meeting:
            meeting.start_datetime = new_start_datetime
            if new_duration is not None:
                meeting.duration = new_duration
            db.commit()
            db.refresh(meeting)
        return meeting


# Create instance
meeting = CRUDMeeting(Meeting) 