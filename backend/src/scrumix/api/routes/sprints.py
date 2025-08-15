"""
Sprint-related API routes
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user
from scrumix.api.schemas.user import UserInDB
from scrumix.api.schemas.sprint import (
    SprintCreate, 
    SprintUpdate, 
    SprintResponse
)
from scrumix.api.models.sprint import SprintStatus
from scrumix.api.crud.sprint import sprint_crud

router = APIRouter()

@router.get("/", response_model=List[SprintResponse])
def get_sprints(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status: Optional[SprintStatus] = Query(None, description="Filter by sprint status"),
    project_id: Optional[int] = Query(None, gt=0, description="Filter by project ID"),
    search: Optional[str] = Query(None, description="Search in sprint name and goal"),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get list of sprints with optional filtering and search
    """
    try:
        if search:
            sprints = sprint_crud.search_sprints(db, search, skip=skip, limit=limit)
        else:
            sprints = sprint_crud.get_sprints(db, skip=skip, limit=limit, status=status, project_id=project_id)
        
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprints: {str(e)}")

@router.post("/", response_model=SprintResponse, status_code=201)
def create_sprint(
    sprint_create: SprintCreate,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Create new sprint
    """
    try:
        sprint = sprint_crud.create_sprint(db, sprint_create)
        return SprintResponse.from_db_model(sprint)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sprint: {str(e)}")

@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint_by_id(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprint by ID
    """
    sprint = sprint_crud.get_by_id(db, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    return SprintResponse.from_db_model(sprint)

@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    sprint_id: int,
    sprint_update: SprintUpdate,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update sprint
    """
    sprint = sprint_crud.update_sprint(db, sprint_id, sprint_update)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return SprintResponse.from_db_model(sprint)

@router.delete("/{sprint_id}", status_code=204)
def delete_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Delete sprint
    """
    success = sprint_crud.delete_sprint(db, sprint_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    return None

@router.get("/status/{status}", response_model=List[SprintResponse])
def get_sprints_by_status(
    status: SprintStatus,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprints by status
    """
    try:
        sprints = sprint_crud.get_sprints_by_status(db, status, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprints by status: {str(e)}")

@router.get("/active/current", response_model=List[SprintResponse])
def get_active_sprints(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get currently active sprints
    """
    try:
        sprints = sprint_crud.get_active_sprints(db, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching active sprints: {str(e)}")

@router.get("/upcoming/scheduled", response_model=List[SprintResponse])
def get_upcoming_sprints(
    days_ahead: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get upcoming sprints within specified days
    """
    try:
        sprints = sprint_crud.get_upcoming_sprints(db, days_ahead=days_ahead, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching upcoming sprints: {str(e)}")

@router.get("/range/dates", response_model=List[SprintResponse])
def get_sprints_by_date_range(
    start_date: datetime = Query(..., description="Start date for range filter"),
    end_date: datetime = Query(..., description="End date for range filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprints within a date range
    """
    try:
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        sprints = sprint_crud.get_sprints_by_date_range(db, start_date, end_date, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprints by date range: {str(e)}")

@router.post("/{sprint_id}/start", response_model=SprintResponse)
def start_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Start a sprint (change status to active)
    """
    try:
        sprint = sprint_crud.start_sprint(db, sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        return SprintResponse.from_db_model(sprint)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting sprint: {str(e)}")

@router.post("/{sprint_id}/close", response_model=SprintResponse)
def close_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Close/complete a sprint
    """
    try:
        sprint = sprint_crud.close_sprint(db, sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        return SprintResponse.from_db_model(sprint)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error closing sprint: {str(e)}")

@router.get("/statistics/overview")
def get_sprint_statistics(
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprint statistics and overview
    """
    try:
        stats = sprint_crud.get_sprint_statistics(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprint statistics: {str(e)}") 