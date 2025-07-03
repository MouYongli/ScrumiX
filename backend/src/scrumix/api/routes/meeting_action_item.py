from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math
from datetime import datetime

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..schemas.meeting_action_item import (
    MeetingActionItemCreate,
    MeetingActionItemUpdate,
    MeetingActionItemResponse,
    MeetingActionItemListResponse
)
from ..crud.meeting_action_item import meeting_action_item
from ..crud.meeting import meeting

router = APIRouter()


@router.get("/", response_model=MeetingActionItemListResponse)
def get_meeting_action_items(
    skip: int = Query(0, ge=0, description="Number of action items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of action items to return"),
    meeting_id: Optional[int] = Query(None, description="Filter by meeting ID"),
    search: Optional[str] = Query(None, description="Search in action item titles"),
    due_before: Optional[datetime] = Query(None, description="Filter by due date before"),
    due_after: Optional[datetime] = Query(None, description="Filter by due date after"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all meeting action items with pagination and optional filtering."""
    action_items, total = meeting_action_item.get_multi_with_pagination(
        db, 
        skip=skip, 
        limit=limit, 
        meeting_id=meeting_id,
        search=search,
        due_before=due_before,
        due_after=due_after
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return MeetingActionItemListResponse(
        actionItems=[MeetingActionItemResponse.model_validate(item) for item in action_items],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=MeetingActionItemResponse, status_code=201)
def create_meeting_action_item(
    item_in: MeetingActionItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new meeting action item."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=item_in.meeting_id)
    if not db_meeting:
        raise HTTPException(
            status_code=404, 
            detail=f"Meeting with ID {item_in.meeting_id} not found"
        )
    
    db_item = meeting_action_item.create(db=db, obj_in=item_in)
    return MeetingActionItemResponse.model_validate(db_item)


@router.get("/{action_id}", response_model=MeetingActionItemResponse)
def get_meeting_action_item_by_id(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific meeting action item by ID."""
    db_item = meeting_action_item.get(db=db, id=action_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Meeting action item not found")
    return MeetingActionItemResponse.model_validate(db_item)


@router.put("/{action_id}", response_model=MeetingActionItemResponse)
def update_meeting_action_item(
    action_id: int,
    item_in: MeetingActionItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific meeting action item."""
    db_item = meeting_action_item.get(db=db, id=action_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Meeting action item not found")
    
    db_item = meeting_action_item.update(db=db, db_obj=db_item, obj_in=item_in)
    return MeetingActionItemResponse.model_validate(db_item)


@router.delete("/{action_id}")
def delete_meeting_action_item(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific meeting action item."""
    db_item = meeting_action_item.get(db=db, id=action_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Meeting action item not found")
    
    meeting_action_item.remove(db=db, id=action_id)
    return {"message": "Meeting action item deleted successfully"}


@router.get("/meeting/{meeting_id}", response_model=List[MeetingActionItemResponse])
def get_action_items_by_meeting(
    meeting_id: int,
    skip: int = Query(0, ge=0, description="Number of action items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of action items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get action items by meeting ID."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    action_items = meeting_action_item.get_by_meeting_id(db=db, meeting_id=meeting_id, skip=skip, limit=limit)
    return [MeetingActionItemResponse.model_validate(item) for item in action_items]


@router.get("/meeting/{meeting_id}/count")
def count_action_items_by_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Count action items for a specific meeting."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    count = meeting_action_item.count_by_meeting_id(db=db, meeting_id=meeting_id)
    return {"meeting_id": meeting_id, "count": count}


@router.delete("/meeting/{meeting_id}/all")
def delete_all_action_items_by_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all action items for a specific meeting."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    deleted_count = meeting_action_item.delete_all_by_meeting_id(db=db, meeting_id=meeting_id)
    return {"message": f"Deleted {deleted_count} action items for meeting {meeting_id}"}


@router.get("/search/{query}", response_model=List[MeetingActionItemResponse])
def search_meeting_action_items(
    query: str,
    meeting_id: Optional[int] = Query(None, description="Optionally filter by meeting ID"),
    skip: int = Query(0, ge=0, description="Number of action items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of action items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search meeting action items by title."""
    action_items = meeting_action_item.search_action_items(
        db=db, query=query, meeting_id=meeting_id, skip=skip, limit=limit
    )
    return [MeetingActionItemResponse.model_validate(item) for item in action_items] 