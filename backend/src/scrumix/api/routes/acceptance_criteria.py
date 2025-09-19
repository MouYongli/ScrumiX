from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
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
from ..core.embedding_service import embedding_service

router = APIRouter()


async def update_criteria_embeddings_background(criteria_id: int, db: Session):
    """Background task to update embeddings for acceptance criteria"""
    try:
        await embedding_service.update_acceptance_criteria_embedding(db, criteria_id)
    except Exception as e:
        print(f"Failed to update embeddings for acceptance criteria {criteria_id}: {e}")


def schedule_embedding_update(background_tasks: BackgroundTasks, criteria_id: int, db: Session):
    """Schedule embedding update as background task"""
    background_tasks.add_task(update_criteria_embeddings_background, criteria_id, db)


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
        acceptance_criteria=[AcceptanceCriteriaResponse.model_validate(c) for c in criteria],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=AcceptanceCriteriaResponse, status_code=201)
def create_acceptance_criteria(
    criteria_in: AcceptanceCriteriaCreate,
    background_tasks: BackgroundTasks,
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
    
    # Schedule embedding generation in background
    schedule_embedding_update(background_tasks, db_criteria.id, db)
    
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific acceptance criteria."""
    db_criteria = acceptance_criteria.get(db=db, id=criteria_id)
    if not db_criteria:
        raise HTTPException(status_code=404, detail="Acceptance criteria not found")
    
    # Store old title for comparison
    old_title = db_criteria.title
    
    db_criteria = acceptance_criteria.update(db=db, db_obj=db_criteria, obj_in=criteria_in)
    
    # Check if title changed and schedule embedding update
    if criteria_in.title and criteria_in.title != old_title:
        schedule_embedding_update(background_tasks, db_criteria.id, db)
    
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


# Semantic search endpoints
@router.get("/semantic-search")
async def semantic_search_acceptance_criteria(
    query: str = Query(..., description="Search query text"),
    backlog_id: Optional[int] = Query(None, description="Filter by backlog ID"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    similarity_threshold: float = Query(0.7, ge=0.0, le=1.0, description="Minimum similarity score"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform semantic search on acceptance criteria using embeddings.
    Searches based on title content.
    """
    try:
        results = await acceptance_criteria.semantic_search(
            db=db,
            query=query,
            backlog_id=backlog_id,
            limit=limit,
            similarity_threshold=similarity_threshold
        )
        
        search_results = []
        for criteria, similarity in results:
            criteria_response = AcceptanceCriteriaResponse.model_validate(criteria)
            search_results.append({
                "criteria": criteria_response,
                "similarity_score": similarity
            })
        
        return {
            "results": search_results,
            "total": len(search_results),
            "query": query,
            "similarity_threshold": similarity_threshold
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {str(e)}"
        )


@router.get("/{criteria_id}/similar")
async def find_similar_acceptance_criteria(
    criteria_id: int,
    limit: int = Query(5, ge=1, le=20, description="Maximum number of similar criteria"),
    similarity_threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity score"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find acceptance criteria similar to the given criteria based on embeddings.
    """
    try:
        results = await acceptance_criteria.find_similar_criteria(
            db=db,
            criteria_id=criteria_id,
            limit=limit,
            similarity_threshold=similarity_threshold
        )
        
        similar_criteria = []
        for criteria, similarity in results:
            criteria_response = AcceptanceCriteriaResponse.model_validate(criteria)
            similar_criteria.append({
                "criteria": criteria_response,
                "similarity_score": similarity
            })
        
        return {
            "similar_criteria": similar_criteria,
            "total": len(similar_criteria),
            "reference_criteria_id": criteria_id,
            "similarity_threshold": similarity_threshold
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Similar criteria search failed: {str(e)}"
        )


@router.post("/{criteria_id}/update-embeddings")
async def update_criteria_embeddings(
    criteria_id: int,
    force: bool = Query(False, description="Force update even if up to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger embedding update for a specific acceptance criteria.
    """
    try:
        success = await acceptance_criteria.update_embedding(db=db, criteria_id=criteria_id, force=force)
        
        if success:
            return {
                "message": f"Embeddings updated successfully for acceptance criteria {criteria_id}",
                "criteria_id": criteria_id
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update embeddings for acceptance criteria {criteria_id}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding update failed: {str(e)}"
        )


@router.post("/update-all-embeddings")
async def update_all_criteria_embeddings(
    backlog_id: Optional[int] = Query(None, description="Filter by backlog ID"),
    force: bool = Query(False, description="Force update all embeddings"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update embeddings for all acceptance criteria (optionally filtered by backlog).
    Admin-only endpoint for batch embedding updates.
    """
    # Check if user has admin privileges (you may want to add proper permission checking)
    if not hasattr(current_user, 'is_superuser') or not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can update all embeddings"
        )
    
    try:
        stats = await acceptance_criteria.update_all_embeddings(
            db=db,
            backlog_id=backlog_id,
            force=force
        )
        
        total_processed = stats["updated"] + stats["failed"] + stats["skipped"]
        message = f"Processed {total_processed} acceptance criteria: {stats['updated']} updated, {stats['skipped']} skipped, {stats['failed']} failed"
        
        return {
            "updated": stats["updated"],
            "failed": stats["failed"],
            "skipped": stats["skipped"],
            "total_processed": total_processed,
            "message": message
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch embedding update failed: {str(e)}"
        ) 