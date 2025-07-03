from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..schemas.acceptance_criteria import (
    AcceptanceCriteriaCreate,
    AcceptanceCriteriaUpdate,
    AcceptanceCriteriaResponse,
    AcceptanceCriteriaListResponse
)
from ..crud.acceptance_criteria import acceptance_criteria
from ..crud.backlog import backlog_crud

router = APIRouter()


@router.get("/", response_model=AcceptanceCriteriaListResponse)
def get_acceptance_criteria(
    skip: int = Query(0, ge=0, description="Number of criteria to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of criteria to return"),
    backlog_id: Optional[int] = Query(None, description="Filter by backlog ID"),
    search: Optional[str] = Query(None, description="Search in criteria titles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all acceptance criteria with pagination and optional filtering."""
    criteria, total = acceptance_criteria.get_multi_with_pagination(
        db, 
        skip=skip, 
        limit=limit, 
        backlog_id=backlog_id,
        search=search
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return AcceptanceCriteriaListResponse(
        acceptanceCriteria=[AcceptanceCriteriaResponse.model_validate(c) for c in criteria],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=AcceptanceCriteriaResponse, status_code=201)
def create_acceptance_criteria(
    criteria_in: AcceptanceCriteriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new acceptance criteria."""
    # Verify backlog exists
    backlog = backlog_crud.get(db=db, id=criteria_in.backlog_id)
    if not backlog:
        raise HTTPException(
            status_code=404, 
            detail=f"Backlog with ID {criteria_in.backlog_id} not found"
        )
    
    db_criteria = acceptance_criteria.create(db=db, obj_in=criteria_in)
    return AcceptanceCriteriaResponse.model_validate(db_criteria)


@router.get("/{criteria_id}", response_model=AcceptanceCriteriaResponse)
def get_acceptance_criteria_by_id(
    criteria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific acceptance criteria by ID."""
    db_criteria = acceptance_criteria.get(db=db, id=criteria_id)
    if not db_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")
    return AcceptanceCriteriaResponse.model_validate(db_criteria)


@router.put("/{criteria_id}", response_model=AcceptanceCriteriaResponse)
def update_acceptance_criteria(
    criteria_id: int,
    criteria_in: AcceptanceCriteriaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific acceptance criteria."""
    db_criteria = acceptance_criteria.get(db=db, id=criteria_id)
    if not db_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")
    
    db_criteria = acceptance_criteria.update(db=db, db_obj=db_criteria, obj_in=criteria_in)
    return AcceptanceCriteriaResponse.model_validate(db_criteria)


@router.delete("/{criteria_id}")
def delete_acceptance_criteria(
    criteria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific acceptance criteria."""
    db_criteria = acceptance_criteria.get(db=db, id=criteria_id)
    if not db_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")
    
    acceptance_criteria.remove(db=db, id=criteria_id)
    return {"message": "Acceptance criteria deleted successfully"}


@router.get("/backlog/{backlog_id}", response_model=List[AcceptanceCriteriaResponse])
def get_criteria_by_backlog(
    backlog_id: int,
    skip: int = Query(0, ge=0, description="Number of criteria to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of criteria to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get acceptance criteria by backlog ID."""
    # Verify backlog exists
    backlog = backlog_crud.get(db=db, id=backlog_id)
    if not backlog:
        raise HTTPException(status_code=404, detail=f"Backlog with ID {backlog_id} not found")
    
    criteria = acceptance_criteria.get_by_backlog_id(db=db, backlog_id=backlog_id, skip=skip, limit=limit)
    return [AcceptanceCriteriaResponse.model_validate(c) for c in criteria]


@router.get("/backlog/{backlog_id}/count")
def count_criteria_by_backlog(
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Count acceptance criteria for a specific backlog."""
    # Verify backlog exists
    backlog = backlog_crud.get(db=db, id=backlog_id)
    if not backlog:
        raise HTTPException(status_code=404, detail=f"Backlog with ID {backlog_id} not found")
    
    count = acceptance_criteria.count_by_backlog_id(db=db, backlog_id=backlog_id)
    return {"backlog_id": backlog_id, "count": count}


@router.post("/backlog/{backlog_id}/bulk", response_model=List[AcceptanceCriteriaResponse])
def bulk_create_criteria(
    backlog_id: int,
    criteria_titles: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create multiple acceptance criteria for a backlog item."""
    # Verify backlog exists
    backlog = backlog_crud.get(db=db, id=backlog_id)
    if not backlog:
        raise HTTPException(status_code=404, detail=f"Backlog with ID {backlog_id} not found")
    
    if not criteria_titles:
        raise HTTPException(status_code=400, detail="At least one criteria title is required")
    
    created_criteria = acceptance_criteria.bulk_create_for_backlog(
        db=db, backlog_id=backlog_id, criteria_titles=criteria_titles
    )
    return [AcceptanceCriteriaResponse.model_validate(c) for c in created_criteria]


@router.delete("/backlog/{backlog_id}/all")
def delete_all_criteria_by_backlog(
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all acceptance criteria for a specific backlog."""
    # Verify backlog exists
    backlog = backlog_crud.get(db=db, id=backlog_id)
    if not backlog:
        raise HTTPException(status_code=404, detail=f"Backlog with ID {backlog_id} not found")
    
    deleted_count = acceptance_criteria.delete_all_by_backlog_id(db=db, backlog_id=backlog_id)
    return {"message": f"Deleted {deleted_count} acceptance criteria for backlog {backlog_id}"}


@router.get("/search/{query}", response_model=List[AcceptanceCriteriaResponse])
def search_acceptance_criteria(
    query: str,
    backlog_id: Optional[int] = Query(None, description="Optionally filter by backlog ID"),
    skip: int = Query(0, ge=0, description="Number of criteria to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of criteria to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search acceptance criteria by title."""
    criteria = acceptance_criteria.search_criteria(
        db=db, query=query, backlog_id=backlog_id, skip=skip, limit=limit
    )
    return [AcceptanceCriteriaResponse.model_validate(c) for c in criteria] 