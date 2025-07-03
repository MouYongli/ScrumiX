from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..schemas.meeting_note import (
    MeetingNoteCreate,
    MeetingNoteUpdate,
    MeetingNoteResponse,
    MeetingNoteListResponse,
    MeetingNoteTreeResponse
)
from ..crud.meeting_note import meeting_note
from ..crud.meeting import meeting

router = APIRouter()


@router.get("/", response_model=MeetingNoteListResponse)
def get_meeting_notes(
    skip: int = Query(0, ge=0, description="Number of notes to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of notes to return"),
    meeting_id: Optional[int] = Query(None, description="Filter by meeting ID"),
    search: Optional[str] = Query(None, description="Search in note content"),
    parent_only: bool = Query(False, description="Show only top-level notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all meeting notes with pagination and optional filtering."""
    notes, total = meeting_note.get_multi_with_pagination(
        db, 
        skip=skip, 
        limit=limit, 
        meeting_id=meeting_id,
        search=search,
        parent_only=parent_only
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return MeetingNoteListResponse(
        notes=[MeetingNoteResponse.model_validate(note) for note in notes],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=MeetingNoteResponse, status_code=201)
def create_meeting_note(
    note_in: MeetingNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new meeting note."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=note_in.meeting_id)
    if not db_meeting:
        raise HTTPException(
            status_code=404, 
            detail=f"Meeting with ID {note_in.meeting_id} not found"
        )
    
    # If parent_note_id is provided, verify it exists and belongs to same meeting
    if note_in.parent_note_id:
        parent_note = meeting_note.get(db=db, id=note_in.parent_note_id)
        if not parent_note:
            raise HTTPException(
                status_code=404,
                detail=f"Parent note with ID {note_in.parent_note_id} not found"
            )
        if parent_note.meeting_id != note_in.meeting_id:
            raise HTTPException(
                status_code=400,
                detail="Parent note must belong to the same meeting"
            )
    
    db_note = meeting_note.create(db=db, obj_in=note_in)
    return MeetingNoteResponse.model_validate(db_note)


@router.get("/{note_id}", response_model=MeetingNoteResponse)
def get_meeting_note_by_id(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific meeting note by ID."""
    db_note = meeting_note.get(db=db, id=note_id)
    if not db_note:
        raise HTTPException(status_code=404, detail="Meeting note not found")
    return MeetingNoteResponse.model_validate(db_note)


@router.put("/{note_id}", response_model=MeetingNoteResponse)
def update_meeting_note(
    note_id: int,
    note_in: MeetingNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific meeting note."""
    db_note = meeting_note.get(db=db, id=note_id)
    if not db_note:
        raise HTTPException(status_code=404, detail="Meeting note not found")
    
    db_note = meeting_note.update(db=db, db_obj=db_note, obj_in=note_in)
    return MeetingNoteResponse.model_validate(db_note)


@router.delete("/{note_id}")
def delete_meeting_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific meeting note and all its children."""
    db_note = meeting_note.get(db=db, id=note_id)
    if not db_note:
        raise HTTPException(status_code=404, detail="Meeting note not found")
    
    meeting_note.remove(db=db, id=note_id)
    return {"message": "Meeting note deleted successfully"}


@router.get("/meeting/{meeting_id}", response_model=List[MeetingNoteResponse])
def get_notes_by_meeting(
    meeting_id: int,
    skip: int = Query(0, ge=0, description="Number of notes to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of notes to return"),
    top_level_only: bool = Query(False, description="Show only top-level notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notes by meeting ID."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    if top_level_only:
        notes = meeting_note.get_top_level_notes_by_meeting(
            db=db, meeting_id=meeting_id, skip=skip, limit=limit
        )
    else:
        notes = meeting_note.get_by_meeting_id(
            db=db, meeting_id=meeting_id, skip=skip, limit=limit
        )
    
    return [MeetingNoteResponse.model_validate(note) for note in notes]


@router.get("/meeting/{meeting_id}/tree", response_model=MeetingNoteTreeResponse)
def get_notes_tree_by_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get hierarchical note tree for a meeting."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    top_level_notes = meeting_note.get_note_tree_by_meeting(db=db, meeting_id=meeting_id)
    total_count = meeting_note.count_by_meeting_id(db=db, meeting_id=meeting_id)
    top_level_count = len(top_level_notes)
    
    def build_note_response_with_children(note):
        """Recursively build note response with children."""
        note_response = MeetingNoteResponse.model_validate(note)
        if hasattr(note, '_children') and note._children:
            note_response.childNotes = [
                build_note_response_with_children(child) for child in note._children
            ]
        return note_response
    
    note_responses = [build_note_response_with_children(note) for note in top_level_notes]
    
    return MeetingNoteTreeResponse(
        notes=note_responses,
        total=total_count,
        topLevelCount=top_level_count
    )


@router.get("/meeting/{meeting_id}/count")
def count_notes_by_meeting(
    meeting_id: int,
    top_level_only: bool = Query(False, description="Count only top-level notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Count notes for a specific meeting."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    if top_level_only:
        count = meeting_note.count_top_level_by_meeting_id(db=db, meeting_id=meeting_id)
    else:
        count = meeting_note.count_by_meeting_id(db=db, meeting_id=meeting_id)
    
    return {
        "meeting_id": meeting_id,
        "count": count,
        "top_level_only": top_level_only
    }


@router.post("/{note_id}/reply", response_model=MeetingNoteResponse, status_code=201)
def create_note_reply(
    note_id: int,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a reply to an existing note."""
    # Verify parent note exists
    parent_note = meeting_note.get(db=db, id=note_id)
    if not parent_note:
        raise HTTPException(status_code=404, detail="Parent note not found")
    
    try:
        reply_note = meeting_note.create_reply(
            db=db,
            parent_note_id=note_id,
            content=content,
            meeting_id=parent_note.meeting_id
        )
        return MeetingNoteResponse.model_validate(reply_note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{note_id}/children", response_model=List[MeetingNoteResponse])
def get_note_children(
    note_id: int,
    skip: int = Query(0, ge=0, description="Number of child notes to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of child notes to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get child notes for a specific note."""
    # Verify parent note exists
    parent_note = meeting_note.get(db=db, id=note_id)
    if not parent_note:
        raise HTTPException(status_code=404, detail="Parent note not found")
    
    child_notes = meeting_note.get_child_notes(
        db=db, parent_note_id=note_id, skip=skip, limit=limit
    )
    return [MeetingNoteResponse.model_validate(note) for note in child_notes]


@router.get("/{note_id}/thread", response_model=List[MeetingNoteResponse])
def get_note_thread(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the entire thread (root note and all descendants) for a note."""
    # Verify note exists
    db_note = meeting_note.get(db=db, id=note_id)
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    thread_notes = meeting_note.get_note_thread(db=db, note_id=note_id)
    return [MeetingNoteResponse.model_validate(note) for note in thread_notes]


@router.delete("/meeting/{meeting_id}/all")
def delete_all_notes_by_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all notes for a specific meeting."""
    # Verify meeting exists
    db_meeting = meeting.get(db=db, id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
    
    deleted_count = meeting_note.delete_all_by_meeting_id(db=db, meeting_id=meeting_id)
    return {"message": f"Deleted {deleted_count} notes for meeting {meeting_id}"}


@router.get("/search/{query}", response_model=List[MeetingNoteResponse])
def search_meeting_notes(
    query: str,
    meeting_id: Optional[int] = Query(None, description="Optionally filter by meeting ID"),
    skip: int = Query(0, ge=0, description="Number of notes to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of notes to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search meeting notes by content."""
    notes = meeting_note.search_notes(
        db=db, query=query, meeting_id=meeting_id, skip=skip, limit=limit
    )
    return [MeetingNoteResponse.model_validate(note) for note in notes] 