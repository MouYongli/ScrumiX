from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math
from datetime import datetime, timedelta

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..models.meeting import MeetingType
from ..schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse
)
from ..crud.meeting import meeting

router = APIRouter()


@router.get("/", response_model=MeetingListResponse)
def get_meetings(
    skip: int = Query(0, ge=0, description="Number of meetings to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of meetings to return"),
    meeting_type: Optional[MeetingType] = Query(None, description="Filter by meeting type"),
    search: Optional[str] = Query(None, description="Search in description and location"),
    upcoming_only: bool = Query(False, description="Show only upcoming meetings"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all meetings with pagination and optional filtering."""
    meetings, total = meeting.get_multi_with_pagination(
        db, 
        skip=skip, 
        limit=limit, 
        meeting_type=meeting_type, 
        search=search,
        upcoming_only=upcoming_only,
        date_from=date_from,
        date_to=date_to
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return MeetingListResponse(
        meetings=[MeetingResponse.model_validate(m) for m in meetings],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=MeetingResponse, status_code=201)
def create_meeting(
    meeting_in: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new meeting."""
    db_meeting = meeting.create(db=db, obj_in=meeting_in)
    return MeetingResponse.model_validate(db_meeting)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific meeting by ID."""
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingResponse.model_validate(db_meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: int,
    meeting_in: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific meeting."""
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    db_meeting = meeting.update(db=db, db_obj=db_meeting, obj_in=meeting_in)
    return MeetingResponse.model_validate(db_meeting)


@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific meeting."""
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting.remove(db=db, id=meeting_id)
    return {"message": "Meeting deleted successfully"}


@router.get("/type/{meeting_type}", response_model=List[MeetingResponse])
def get_meetings_by_type(
    meeting_type: MeetingType,
    skip: int = Query(0, ge=0, description="Number of meetings to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of meetings to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get meetings by type."""
    meetings = meeting.get_by_type(db=db, meeting_type=meeting_type, skip=skip, limit=limit)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/upcoming/list", response_model=List[MeetingResponse])
def get_upcoming_meetings(
    days_ahead: int = Query(7, ge=1, le=365, description="Number of days ahead to search"),
    limit: int = Query(100, ge=1, le=1000, description="Number of meetings to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get upcoming meetings within specified days."""
    meetings = meeting.get_upcoming_meetings(db=db, days_ahead=days_ahead, limit=limit)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/today/list", response_model=List[MeetingResponse])
def get_today_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get today's meetings."""
    meetings = meeting.get_today_meetings(db=db)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/ongoing/list", response_model=List[MeetingResponse])
def get_ongoing_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get currently ongoing meetings."""
    meetings = meeting.get_ongoing_meetings(db=db)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/search/{query}", response_model=List[MeetingResponse])
def search_meetings(
    query: str,
    skip: int = Query(0, ge=0, description="Number of meetings to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of meetings to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search meetings by description and location."""
    meetings = meeting.search_meetings(db=db, query=query, skip=skip, limit=limit)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/date-range/list", response_model=List[MeetingResponse])
def get_meetings_by_date_range(
    start_date: datetime = Query(..., description="Start date for range"),
    end_date: datetime = Query(..., description="End date for range"),
    skip: int = Query(0, ge=0, description="Number of meetings to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of meetings to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get meetings within a date range."""
    if start_date >= end_date:
        raise HTTPException(status_code=400, detail="Start date must be before end date")
    
    meetings = meeting.get_meetings_by_date_range(
        db=db, start_date=start_date, end_date=end_date, skip=skip, limit=limit
    )
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/statistics/overview")
def get_meeting_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get meeting statistics by type and time periods."""
    stats = meeting.get_meeting_statistics(db=db)
    return {
        "statistics": stats,
        "message": "Meeting statistics retrieved successfully"
    }


@router.patch("/{meeting_id}/reschedule", response_model=MeetingResponse)
def reschedule_meeting(
    meeting_id: int,
    new_start_datetime: datetime = Query(..., description="New start date and time"),
    new_duration: Optional[int] = Query(None, ge=5, le=480, description="New duration in minutes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reschedule a meeting."""
    if new_start_datetime < datetime.now():
        raise HTTPException(status_code=400, detail="Cannot reschedule to a past time")
    
    db_meeting = meeting.reschedule_meeting(
        db=db, 
        meeting_id=meeting_id, 
        new_start_datetime=new_start_datetime,
        new_duration=new_duration
    )
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return MeetingResponse.model_validate(db_meeting) 