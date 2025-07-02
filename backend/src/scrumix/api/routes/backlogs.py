"""
Backlog management API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from scrumix.api.core.security import get_current_user
from scrumix.api.db.database import get_db
from scrumix.api.crud.backlog import backlog_crud
from scrumix.api.models.backlog import BacklogStatus, BacklogPriority
from scrumix.api.schemas.backlog import (
    BacklogResponse, BacklogCreate, BacklogUpdate
)

router = APIRouter()

@router.get("/", response_model=List[BacklogResponse])
async def get_backlogs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search term"),
    root_only: bool = Query(False, description="Show only root items (no parents)"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of backlog items"""
    try:
        # Validate status parameter
        backlog_status = None
        if status:
            try:
                backlog_status = BacklogStatus(status.replace("-", "_").upper())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status}"
                )
        
        # Validate priority parameter
        backlog_priority = None
        if priority:
            try:
                backlog_priority = BacklogPriority(priority.upper())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid priority: {priority}"
                )
        
        # Execute search or get backlog list
        if search:
            backlogs = backlog_crud.search_backlogs(db, search, skip=skip, limit=limit)
        elif root_only:
            backlogs = backlog_crud.get_root_backlogs(db, skip=skip, limit=limit)
        else:
            backlogs = backlog_crud.get_backlogs(db, skip=skip, limit=limit, 
                                               status=backlog_status, priority=backlog_priority)
        
        # Convert to response format
        response_backlogs = []
        for backlog in backlogs:
            # Get children for hierarchical display
            children = backlog_crud.get_children(db, backlog.backlog_id)
            
            # Get parent title if exists
            parent_title = None
            if backlog.parent_id:
                parent = backlog_crud.get_by_id(db, backlog.parent_id)
                if parent:
                    parent_title = parent.title
            
            backlog_response = BacklogResponse.from_db_model(
                backlog=backlog,
                children=children,
                parent_title=parent_title
            )
            response_backlogs.append(backlog_response)
        
        return response_backlogs
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/", response_model=BacklogResponse, status_code=status.HTTP_201_CREATED)
async def create_backlog(
    backlog_create: BacklogCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new backlog item"""
    try:
        # Create backlog
        backlog = backlog_crud.create_backlog(db, backlog_create)
        
        # Convert to response format
        parent_title = None
        if backlog.parent_id:
            parent = backlog_crud.get_by_id(db, backlog.parent_id)
            if parent:
                parent_title = parent.title
        
        backlog_response = BacklogResponse.from_db_model(
            backlog=backlog,
            parent_title=parent_title
        )
        
        return backlog_response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{backlog_id}", response_model=BacklogResponse)
async def get_backlog(
    backlog_id: int,
    include_children: bool = Query(True, description="Include child items"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get backlog item details by ID"""
    backlog = backlog_crud.get_by_id(db, backlog_id)
    if not backlog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backlog item not found"
        )
    
    # Get children if requested
    children = None
    if include_children:
        children = backlog_crud.get_children(db, backlog_id)
    
    # Get parent title if exists
    parent_title = None
    if backlog.parent_id:
        parent = backlog_crud.get_by_id(db, backlog.parent_id)
        if parent:
            parent_title = parent.title
    
    backlog_response = BacklogResponse.from_db_model(
        backlog=backlog,
        children=children,
        parent_title=parent_title
    )
    
    return backlog_response

@router.put("/{backlog_id}", response_model=BacklogResponse)
async def update_backlog(
    backlog_id: int,
    backlog_update: BacklogUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update backlog item information"""
    try:
        updated_backlog = backlog_crud.update_backlog(db, backlog_id, backlog_update)
        if not updated_backlog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backlog item not found"
            )
        
        # Get parent title if exists
        parent_title = None
        if updated_backlog.parent_id:
            parent = backlog_crud.get_by_id(db, updated_backlog.parent_id)
            if parent:
                parent_title = parent.title
        
        backlog_response = BacklogResponse.from_db_model(
            backlog=updated_backlog,
            parent_title=parent_title
        )
        
        return backlog_response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{backlog_id}")
async def delete_backlog(
    backlog_id: int,
    delete_children: bool = Query(False, description="Also delete child items"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete backlog item"""
    success = backlog_crud.delete_backlog(db, backlog_id, delete_children=delete_children)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backlog item not found"
        )
    
    message = "Backlog item deleted successfully"
    if delete_children:
        message += " (including all child items)"
    
    return {"message": message}

@router.get("/{backlog_id}/children", response_model=List[BacklogResponse])
async def get_backlog_children(
    backlog_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all children of a backlog item"""
    # Verify parent exists
    parent = backlog_crud.get_by_id(db, backlog_id)
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent backlog item not found"
        )
    
    children = backlog_crud.get_children(db, backlog_id)
    
    response_children = []
    for child in children:
        # Get grandchildren for each child
        grandchildren = backlog_crud.get_children(db, child.backlog_id)
        
        child_response = BacklogResponse.from_db_model(
            backlog=child,
            children=grandchildren,
            parent_title=parent.title
        )
        response_children.append(child_response)
    
    return response_children

@router.get("/status/{status}", response_model=List[BacklogResponse])
async def get_backlogs_by_status(
    status: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get backlog items by status"""
    try:
        # Convert status parameter
        backlog_status = BacklogStatus(status.replace("-", "_").upper())
        
        backlogs = backlog_crud.get_backlogs(db, skip=skip, limit=limit, status=backlog_status)
        
        # Convert to response format
        response_backlogs = []
        for backlog in backlogs:
            children = backlog_crud.get_children(db, backlog.backlog_id)
            
            parent_title = None
            if backlog.parent_id:
                parent = backlog_crud.get_by_id(db, backlog.parent_id)
                if parent:
                    parent_title = parent.title
            
            backlog_response = BacklogResponse.from_db_model(
                backlog=backlog,
                children=children,
                parent_title=parent_title
            )
            response_backlogs.append(backlog_response)
        
        return response_backlogs
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}"
        )

@router.get("/priority/{priority}", response_model=List[BacklogResponse])
async def get_backlogs_by_priority(
    priority: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get backlog items by priority"""
    try:
        # Convert priority parameter
        backlog_priority = BacklogPriority(priority.upper())
        
        backlogs = backlog_crud.get_backlogs(db, skip=skip, limit=limit, priority=backlog_priority)
        
        # Convert to response format
        response_backlogs = []
        for backlog in backlogs:
            children = backlog_crud.get_children(db, backlog.backlog_id)
            
            parent_title = None
            if backlog.parent_id:
                parent = backlog_crud.get_by_id(db, backlog.parent_id)
                if parent:
                    parent_title = parent.title
            
            backlog_response = BacklogResponse.from_db_model(
                backlog=backlog,
                children=children,
                parent_title=parent_title
            )
            response_backlogs.append(backlog_response)
        
        return response_backlogs
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority: {priority}"
        ) 