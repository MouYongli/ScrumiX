from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, String
from datetime import datetime, timedelta

from .base import CRUDBase
from ..models.meeting import Meeting, MeetingType
from ..models.meeting_participant import MeetingParticipant
from ..schemas.meeting import MeetingCreate, MeetingUpdate


class CRUDMeeting(CRUDBase[Meeting, MeetingCreate, MeetingUpdate]):
    """CRUD operations for Meeting."""
    
    def create(self, db: Session, *, obj_in: MeetingCreate) -> Meeting:
        """Create a new meeting with sprint_id and project_id."""
        obj_in_data = obj_in.model_dump(by_alias=True)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_id(self, db: Session, meeting_id: int) -> Optional[Meeting]:
        """Get a meeting by ID."""
        return db.query(self.model).filter(self.model.id == meeting_id).first()
    
    def get_upcoming_meetings(
        self,
        db: Session,
        user_id: int,
        days: int = 7,
        limit: int = 100
    ) -> List[Meeting]:
        """Get upcoming meetings for a specific user within specified days."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        end_date = now + timedelta(days=days)
        return (
            db.query(self.model)
            .join(MeetingParticipant)
            .filter(
                and_(
                    MeetingParticipant.user_id == user_id,
                    self.model.start_datetime > now,
                    self.model.start_datetime <= end_date
                )
            )
            .order_by(self.model.start_datetime.asc())
            .limit(limit)
            .all()
        )
    
    def get_meetings_by_project(
        self,
        db: Session,
        project_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Get meetings by project ID."""
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id)
            .order_by(self.model.start_datetime.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_multi(
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
    ) -> List[Meeting]:
        """Get multiple meetings with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply meeting type filter
        if meeting_type:
            query = query.filter(self.model.meeting_type == meeting_type)
        
        # Apply search filter
        if search:
            search_filter = or_(
                self.model.description.ilike(f"%{search}%"),
                self.model.location.ilike(f"%{search}%"),
                self.model.title.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Apply upcoming only filter
        if upcoming_only:
            from datetime import timezone
            now = datetime.now(timezone.utc)
            query = query.filter(self.model.start_datetime > now)
        
        # Apply date range filter
        if date_from:
            query = query.filter(self.model.start_datetime >= date_from)
        if date_to:
            query = query.filter(self.model.start_datetime <= date_to)
        
        return query.order_by(self.model.start_datetime.asc()).offset(skip).limit(limit).all()
    
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
    
    def search(
        self,
        db: Session,
        *,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Search meetings by description and location."""
        search_filter = or_(
            self.model.description.ilike(f"%{search_term}%"),
            self.model.location.ilike(f"%{search_term}%"),
            self.model.title.ilike(f"%{search_term}%")
        )
        return (
            db.query(self.model)
            .filter(search_filter)
            .order_by(self.model.start_datetime.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_upcoming(
        self,
        db: Session,
        *,
        days: int = 7,
        limit: int = 100
    ) -> List[Meeting]:
        """Get upcoming meetings within specified days."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        end_date = now + timedelta(days=days)
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.start_datetime > now,
                    self.model.start_datetime <= end_date
                )
            )
            .order_by(self.model.start_datetime.asc())
            .limit(limit)
            .all()
        )
    
    def get_today(self, db: Session) -> List[Meeting]:
        """Get today's meetings."""
        from datetime import timezone
        today = datetime.now(timezone.utc).date()
        return (
            db.query(self.model)
            .filter(func.date(self.model.start_datetime) == today)
            .order_by(self.model.start_datetime.asc())
            .all()
        )
    
    def get_ongoing(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Get currently ongoing meetings."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # Get all meetings and filter in Python for SQLite compatibility
        all_meetings = (
            db.query(self.model)
            .filter(self.model.start_datetime <= now)
            .order_by(self.model.start_datetime.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        # Filter ongoing meetings in Python
        ongoing_meetings = []
        for meeting in all_meetings:
            end_time = meeting.start_datetime + timedelta(minutes=meeting.duration)
            if end_time >= now:
                ongoing_meetings.append(meeting)
        
        return ongoing_meetings
    
    def get_by_date_range(
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
    
    def get_statistics(self, db: Session) -> dict:
        """Get meeting statistics by type and time periods."""
        total_meetings = db.query(self.model).count()
        
        # Get meetings by type
        meetings_by_type = (
            db.query(self.model.meeting_type, func.count(self.model.id))
            .group_by(self.model.meeting_type)
            .all()
        )
        
        # Calculate average duration
        avg_duration = (
            db.query(func.avg(self.model.duration))
            .scalar()
        )
        
        return {
            "total_meetings": total_meetings,
            "meetings_by_type": dict(meetings_by_type),
            "average_duration_minutes": round(avg_duration or 0, 2)
        }
    
    def reschedule(
        self,
        db: Session,
        *,
        meeting_id: int,
        new_start_datetime: datetime,
        new_duration: int
    ) -> Optional[Meeting]:
        """Reschedule a meeting."""
        meeting = self.get_by_id(db, meeting_id=meeting_id)
        if not meeting:
            return None
        
        meeting.start_datetime = new_start_datetime
        meeting.duration = new_duration
        db.commit()
        db.refresh(meeting)
        return meeting
    
    def search_meetings_by_project(
        self,
        db: Session,
        project_id: int,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Search meetings by project ID and search query."""
        search_filter = or_(
            self.model.title.ilike(f"%{query}%"),
            self.model.description.ilike(f"%{query}%"),
            self.model.location.ilike(f"%{query}%")
        )
        
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id)
            .filter(search_filter)
            .order_by(self.model.start_datetime.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


# Create instance
meeting_crud = CRUDMeeting(Meeting) 