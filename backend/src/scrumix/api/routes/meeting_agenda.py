from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
import math
import json

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..schemas.meeting_agenda import (
    MeetingAgendaCreate,
    MeetingAgendaUpdate,
    MeetingAgendaResponse,
    MeetingAgendaListResponse,
    MeetingAgendaReorderRequest
)
from ..crud.meeting_agenda import meeting_agenda
from ..crud.meeting import meeting_crud

router = APIRouter()


@router.get("/", response_model=MeetingAgendaListResponse)
def get_meeting_agendas(
    skip: int = Query(0, ge=0, description="Number of agenda items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of agenda items to return"),
    meeting_id: Optional[int] = Query(None, description="Filter by meeting ID"),
    search: Optional[str] = Query(None, description="Search in agenda titles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all meeting agenda items with pagination and optional filtering."""
    agenda_items, total = meeting_agenda.get_multi_with_pagination(
        db, 
        skip=skip, 
        limit=limit, 
        meeting_id=meeting_id,
        search=search
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return MeetingAgendaListResponse(
        agendaItems=[MeetingAgendaResponse.model_validate(item) for item in agenda_items],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=MeetingAgendaResponse, status_code=201)
def create_meeting_agenda(
    agenda_in: MeetingAgendaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new meeting agenda item."""
    # Verify meeting exists
    db_meeting = meeting_crud.get(db=db, id=agenda_in.meeting_id)
    if not db_meeting:
        raise HTTPException(
            status_code=404, 
            detail=f"Meeting with ID {agenda_in.meeting_id} not found"
        )
    
    db_agenda = meeting_agenda.create(db=db, obj_in=agenda_in)
    return MeetingAgendaResponse.model_validate(db_agenda)


@router.post("/reorder")
async def reorder_agenda_items(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reorder agenda items by providing a new order of agenda IDs."""
    try:
        # Get raw request body for debugging
        body = await request.body()
        print(f"DEBUG: Raw request body: {body}")
        
        # Parse JSON manually for debugging
        body_data = json.loads(body)
        print(f"DEBUG: Parsed body data: {body_data}")
        print(f"DEBUG: Body data type: {type(body_data)}")
        
        # Check if agenda_ids exists
        if 'agenda_ids' not in body_data:
            print(f"DEBUG: agenda_ids not found in body_data. Keys: {list(body_data.keys())}")
            return {"error": "agenda_ids field is missing", "received": body_data}
        
        agenda_ids = body_data['agenda_ids']
        print(f"DEBUG: agenda_ids: {agenda_ids}")
        print(f"DEBUG: agenda_ids type: {type(agenda_ids)}")
        
        # Basic validation
        if not isinstance(agenda_ids, list):
            return {"error": "agenda_ids must be a list", "received_type": str(type(agenda_ids))}
        
        if not agenda_ids:
            return {"error": "agenda_ids cannot be empty"}
        
        # For now, just return success
        return {"success": True, "received_ids": agenda_ids, "count": len(agenda_ids)}
        
    except Exception as e:
        print(f"DEBUG: Error processing request: {e}")
        return {"error": f"Invalid request format: {e}"}


@router.get("/{agenda_id}", response_model=MeetingAgendaResponse)
def get_meeting_agenda_by_id(
    agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific meeting agenda item by ID."""
    db_agenda = meeting_agenda.get(db=db, id=agenda_id)
    if not db_agenda:
        raise HTTPException(status_code=404, detail="Meeting agenda item not found")
    return MeetingAgendaResponse.model_validate(db_agenda)


@router.put("/{agenda_id}", response_model=MeetingAgendaResponse)
def update_meeting_agenda(
    agenda_id: int,
    agenda_in: MeetingAgendaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific meeting agenda item."""
    db_agenda = meeting_agenda.get(db=db, id=agenda_id)
    if not db_agenda:
        raise HTTPException(status_code=404, detail="Meeting agenda item not found")
    
    db_agenda = meeting_agenda.update(db=db, db_obj=db_agenda, obj_in=agenda_in)
    return MeetingAgendaResponse.model_validate(db_agenda)


@router.delete("/{agenda_id}")
def delete_meeting_agenda(
    agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific meeting agenda item."""
    db_agenda = meeting_agenda.get(db=db, id=agenda_id)
    if not db_agenda:
        raise HTTPException(status_code=404, detail="Meeting agenda item not found")
    
    meeting_agenda.remove(db=db, id=agenda_id)
    return {"message": "Meeting agenda item deleted successfully"}


@router.get("/meeting/{meeting_id}", response_model=List[MeetingAgendaResponse])
def get_agenda_by_meeting(
    meeting_id: int,
    skip: int = Query(0, ge=0, description="Number of agenda items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of agenda items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agenda items by meeting ID."""
    # Verify meeting exists
    db_meeting = meeting_crud.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    agenda_items = meeting_agenda.get_by_meeting_id(db=db, meeting_id=meeting_id, skip=skip, limit=limit)
    return [MeetingAgendaResponse.model_validate(item) for item in agenda_items]


@router.get("/meeting/{meeting_id}/count")
def count_agenda_by_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Count agenda items for a specific meeting."""
    # Verify meeting exists
    db_meeting = meeting_crud.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    count = meeting_agenda.count_by_meeting_id(db=db, meeting_id=meeting_id)
    return {"meeting_id": meeting_id, "count": count}


@router.post("/meeting/{meeting_id}/bulk", response_model=List[MeetingAgendaResponse], status_code=201)
def bulk_create_agenda_items(
    meeting_id: int,
    agenda_titles: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create multiple agenda items for a meeting."""
    # Verify meeting exists
    db_meeting = meeting_crud.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    if not agenda_titles:
        raise HTTPException(status_code=400, detail="At least one agenda title is required")
    
    created_items = meeting_agenda.bulk_create_for_meeting(
        db=db, meeting_id=meeting_id, agenda_titles=agenda_titles
    )
    return [MeetingAgendaResponse.model_validate(item) for item in created_items]


@router.delete("/meeting/{meeting_id}/all")
def delete_all_agenda_by_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all agenda items for a specific meeting."""
    # Verify meeting exists
    db_meeting = meeting_crud.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    deleted_count = meeting_agenda.delete_all_by_meeting_id(db=db, meeting_id=meeting_id)
    return {"message": f"Deleted {deleted_count} agenda items for meeting {meeting_id}"}


@router.get("/search/{query}", response_model=List[MeetingAgendaResponse])
def search_meeting_agendas(
    query: str,
    meeting_id: Optional[int] = Query(None, description="Optionally filter by meeting ID"),
    skip: int = Query(0, ge=0, description="Number of agenda items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of agenda items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search meeting agenda items by title."""
    agenda_items = meeting_agenda.search_agenda_items(
        db=db, query=query, meeting_id=meeting_id, skip=skip, limit=limit
    )
    return [MeetingAgendaResponse.model_validate(item) for item in agenda_items]


@router.get("/upcoming/list", response_model=List[MeetingAgendaResponse])
def get_upcoming_meeting_agendas(
    skip: int = Query(0, ge=0, description="Number of agenda items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of agenda items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agenda items for upcoming meetings."""
    agenda_items = meeting_agenda.get_upcoming_meeting_agendas(db=db, skip=skip, limit=limit)
    return [MeetingAgendaResponse.model_validate(item) for item in agenda_items] 