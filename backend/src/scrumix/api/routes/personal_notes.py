"""
Personal Notes API routes for calendar functionality
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as fastapi_status
from sqlalchemy.orm import Session
from datetime import date

from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user
from scrumix.api.crud.personal_note import personal_note_crud
from scrumix.api.crud.project import project_crud
from scrumix.api.crud.user_project import user_project_crud
from scrumix.api.schemas.personal_note import PersonalNoteCreate, PersonalNoteUpdate, PersonalNoteResponse

router = APIRouter(tags=["personal-notes"])


@router.get("/projects/{project_id}/personal-notes", response_model=List[PersonalNoteResponse])
async def get_personal_notes(
    project_id: int,
    start_date: Optional[date] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personal notes for a project."""
    try:
        # Verify user has access to the project
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=project_id):
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
        
        # Get notes based on date range or all notes
        if start_date and end_date:
            notes = personal_note_crud.get_by_date_range(
                db, 
                user_id=current_user.id, 
                project_id=project_id, 
                start_date=start_date, 
                end_date=end_date
            )
        else:
            notes = personal_note_crud.get_by_user_and_project(
                db, 
                user_id=current_user.id, 
                project_id=project_id, 
                skip=skip, 
                limit=limit
            )
        
        return notes
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/projects/{project_id}/personal-notes", response_model=PersonalNoteResponse)
async def create_personal_note(
    project_id: int,
    note_in: PersonalNoteCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new personal note for a project."""
    try:
        # Verify user has access to the project
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=project_id):
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
        
        # Check if note already exists for this date
        existing_note = personal_note_crud.get_by_user_project_and_date(
            db, 
            user_id=current_user.id, 
            project_id=project_id, 
            note_date=note_in.note_date
        )
        
        if existing_note:
            raise HTTPException(
                status_code=fastapi_status.HTTP_409_CONFLICT,
                detail=f"A personal note already exists for {note_in.note_date}. Use PUT to update it."
            )
        
        # Create the note
        note = personal_note_crud.create_with_user_and_project(
            db, 
            obj_in=note_in, 
            user_id=current_user.id, 
            project_id=project_id
        )
        
        return note
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/projects/{project_id}/personal-notes/{note_date}", response_model=PersonalNoteResponse)
async def update_personal_note(
    project_id: int,
    note_date: date,
    note_update: PersonalNoteUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a personal note for a specific date."""
    try:
        # Verify user has access to the project
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=project_id):
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
        
        # Update the note
        updated_note = personal_note_crud.update_by_user_project_and_date(
            db, 
            user_id=current_user.id, 
            project_id=project_id, 
            note_date=note_date, 
            obj_in=note_update
        )
        
        if not updated_note:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail=f"Personal note not found for {note_date}"
            )
        
        return updated_note
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/projects/{project_id}/personal-notes/{note_date}")
async def delete_personal_note(
    project_id: int,
    note_date: date,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a personal note for a specific date."""
    try:
        # Verify user has access to the project
        if not user_project_crud.check_user_access(db, user_id=current_user.id, project_id=project_id):
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
        
        # Delete the note
        deleted_note = personal_note_crud.delete_by_user_project_and_date(
            db, 
            user_id=current_user.id, 
            project_id=project_id, 
            note_date=note_date
        )
        
        if not deleted_note:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail=f"Personal note not found for {note_date}"
            )
        
        return {"message": f"Personal note for {note_date} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
