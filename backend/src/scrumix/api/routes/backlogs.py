"""
Backlog-related API routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as fastapi_status
from sqlalchemy.orm import Session
from scrumix.api.db.database import get_db
from scrumix.api.core.security import get_current_user_hybrid
from scrumix.api.crud.backlog import backlog_crud
from scrumix.api.models.backlog import BacklogStatus, BacklogPriority, BacklogType
from scrumix.api.models.user import User
from scrumix.api.schemas.backlog import (
    BacklogResponse,
    BacklogCreate,
    BacklogUpdate
)
from scrumix.api.utils.notification_helpers import notification_helper

router = APIRouter(tags=["backlogs"])


@router.get("/", response_model=List[BacklogResponse])
def get_backlogs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    status: Optional[BacklogStatus] = Query(None, description="Filter by status"),
    priority: Optional[BacklogPriority] = Query(None, description="Filter by priority"),
    item_type: Optional[BacklogType] = Query(None, description="Filter by item type"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    sprint_id: Optional[int] = Query(None, description="Filter by sprint ID"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    search: Optional[str] = Query(None, description="Search term for title and description"),
    include_children: bool = Query(False, description="Include child items"),
    include_acceptance_criteria: bool = Query(False, description="Include acceptance criteria"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> List[BacklogResponse]:
    """Get all backlog items with optional filtering"""
    try:
        if search:
            backlogs = backlog_crud.search_backlogs(db, search, skip, limit)
        else:
            print(f"Fetching backlogs with include_acceptance_criteria={include_acceptance_criteria}")
            backlogs = backlog_crud.get_backlogs(
                db,
                skip,
                limit,
                status,
                priority,
                item_type,
                project_id,
                sprint_id,
                assigned_to_id,
                False,  # root_only
                include_children,
                include_acceptance_criteria
            )
            print(f"Retrieved {len(backlogs)} backlogs")
            for backlog in backlogs:
                print(f"Backlog {backlog.id}: has acceptance_criteria={hasattr(backlog, 'acceptance_criteria')}, count={len(backlog.acceptance_criteria) if hasattr(backlog, 'acceptance_criteria') else 'N/A'}")
        
        # Convert to response format
        return [
            BacklogResponse.from_db_model(backlog)
            for backlog in backlogs
        ]
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching backlogs: {str(e)}"
        )


@router.get("/{backlog_id}", response_model=BacklogResponse)
def get_backlog(
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> BacklogResponse:
    """Get a specific backlog item by ID"""
    backlog = backlog_crud.get(db=db, id=backlog_id)
    if not backlog:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Backlog not found"
        )
    return BacklogResponse.from_db_model(backlog)


@router.post("/", response_model=BacklogResponse, status_code=fastapi_status.HTTP_201_CREATED)
def create_backlog(
    backlog: BacklogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> BacklogResponse:
    """Create a new backlog item"""
    try:
        created_backlog = backlog_crud.create(db=db, obj_in=backlog)
        

        return BacklogResponse.from_db_model(created_backlog)
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating backlog: {str(e)}"
        )


@router.put("/{backlog_id}", response_model=BacklogResponse)
def update_backlog(
    backlog_id: int,
    backlog: BacklogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> BacklogResponse:
    """Update a backlog item"""
    existing_backlog = backlog_crud.get(db=db, id=backlog_id)
    if not existing_backlog:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Backlog not found"
        )
    
    try:
        updated_backlog = backlog_crud.update_backlog(db=db, backlog_id=backlog_id, backlog_update=backlog)
        if not updated_backlog:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Backlog item not found or update failed"
            )
        return BacklogResponse.from_db_model(updated_backlog)
    except ValueError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating backlog: {str(e)}"
        )


@router.delete("/{backlog_id}", status_code=fastapi_status.HTTP_204_NO_CONTENT)
def delete_backlog(
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
):
    """Delete a backlog item"""
    existing_backlog = backlog_crud.get(db=db, id=backlog_id)
    if not existing_backlog:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Backlog not found"
        )
    
    try:
        backlog_crud.delete_backlog(db=db, backlog_id=backlog_id)
        return None
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting backlog: {str(e)}"
        )


@router.post("/{backlog_id}/status", response_model=BacklogResponse)
def update_backlog_status(
    backlog_id: int,
    status: BacklogStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> BacklogResponse:
    """Update backlog status"""
    try:
        # Create a BacklogUpdate object with just the status field
        from scrumix.api.schemas.backlog import BacklogUpdate
        status_update = BacklogUpdate(status=status)
        
        updated_backlog = backlog_crud.update_backlog(db=db, backlog_id=backlog_id, backlog_update=status_update)
        if not updated_backlog:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Backlog item not found or update failed"
            )
        return BacklogResponse.from_db_model(updated_backlog)
    except ValueError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating backlog status: {str(e)}"
        )


@router.post("/bulk-status")
def bulk_update_status(
    backlog_ids: List[int],
    status: BacklogStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> dict:
    """Bulk update status of multiple backlog items"""
    try:
        updated_count = backlog_crud.bulk_update_status(
            db=db, backlog_ids=backlog_ids, status=status
        )
        return {"updated_count": updated_count}
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error bulk updating status: {str(e)}"
        )

@router.get("/{backlog_id}/children", response_model=List[BacklogResponse])
def get_backlog_children(
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> List[BacklogResponse]:
    """Get children of a backlog item"""
    try:
        children = backlog_crud.get_children(db=db, parent_id=backlog_id)
        return [BacklogResponse.from_db_model(child) for child in children]
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching backlog children: {str(e)}"
        )

@router.get("/status/{status_filter}", response_model=List[BacklogResponse])
def get_backlogs_by_status(
    status_filter: BacklogStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> List[BacklogResponse]:
    """Get backlog items by status"""
    try:
        backlogs = backlog_crud.get_backlogs_by_status(db=db, status=status_filter)
        return [BacklogResponse.from_db_model(backlog) for backlog in backlogs]
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching backlogs by status: {str(e)}"
        )

@router.get("/priority/{priority_filter}", response_model=List[BacklogResponse])
def get_backlogs_by_priority(
    priority_filter: BacklogPriority,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_hybrid)
) -> List[BacklogResponse]:
    """Get backlog items by priority"""
    try:
        backlogs = backlog_crud.get_backlogs_by_priority(db=db, priority=priority_filter)
        return [BacklogResponse.from_db_model(backlog) for backlog in backlogs]
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching backlogs by priority: {str(e)}"
        ) 