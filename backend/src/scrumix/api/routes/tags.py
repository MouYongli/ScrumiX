from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..schemas.tag import (
    TagCreate,
    TagUpdate,
    TagResponse,
    TagListResponse
)
from ..crud.tag import tag

router = APIRouter()


@router.get("/", response_model=TagListResponse)
def get_tags(
    skip: int = Query(0, ge=0, description="Number of tags to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of tags to return"),
    search: Optional[str] = Query(None, description="Search in tag titles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tags with pagination and optional filtering."""
    tags, total = tag.get_multi_with_pagination(
        db, 
        skip=skip, 
        limit=limit, 
        search=search
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return TagListResponse(
        tags=[TagResponse.model_validate(t) for t in tags],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=TagResponse, status_code=201)
def create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tag."""
    # Check if tag with same title already exists
    if tag.check_title_exists(db=db, title=tag_in.title):
        raise HTTPException(
            status_code=400, 
            detail=f"Tag with title '{tag_in.title}' already exists"
        )
    
    db_tag = tag.create(db=db, obj_in=tag_in)
    return TagResponse.model_validate(db_tag)


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific tag by ID."""
    db_tag = tag.get(db=db, id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return TagResponse.model_validate(db_tag)


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: int,
    tag_in: TagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific tag."""
    db_tag = tag.get(db=db, id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if new title conflicts with existing tag
    if tag_in.title and tag.check_title_exists(db=db, title=tag_in.title, exclude_id=tag_id):
        raise HTTPException(
            status_code=400, 
            detail=f"Tag with title '{tag_in.title}' already exists"
        )
    
    db_tag = tag.update(db=db, db_obj=db_tag, obj_in=tag_in)
    return TagResponse.model_validate(db_tag)


@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific tag."""
    db_tag = tag.get(db=db, id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    tag.remove(db=db, id=tag_id)
    return {"message": "Tag deleted successfully"}


@router.get("/title/{title}", response_model=TagResponse)
def get_tag_by_title(
    title: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a tag by title (case-insensitive)."""
    db_tag = tag.get_by_title(db=db, title=title)
    if not db_tag:
        raise HTTPException(status_code=404, detail=f"Tag with title '{title}' not found")
    return TagResponse.model_validate(db_tag)


@router.post("/get-or-create", response_model=TagResponse)
def get_or_create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get existing tag by title or create a new one."""
    db_tag = tag.get_or_create_by_title(db=db, title=tag_in.title, tag_data=tag_in)
    return TagResponse.model_validate(db_tag)


@router.get("/search/{query}", response_model=List[TagResponse])
def search_tags(
    query: str,
    skip: int = Query(0, ge=0, description="Number of tags to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of tags to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search tags by title."""
    tags = tag.search_tags(db=db, query=query, skip=skip, limit=limit)
    return [TagResponse.model_validate(t) for t in tags]


@router.get("/autocomplete/{prefix}", response_model=List[TagResponse])
def autocomplete_tags(
    prefix: str,
    limit: int = Query(10, ge=1, le=50, description="Number of suggestions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tag suggestions for autocomplete (tags starting with prefix)."""
    tags = tag.get_tags_starting_with(db=db, prefix=prefix, limit=limit)
    return [TagResponse.model_validate(t) for t in tags]


@router.get("/popular/list", response_model=List[TagResponse])
def get_popular_tags(
    limit: int = Query(10, ge=1, le=50, description="Number of popular tags to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get most popular tags."""
    tags = tag.get_popular_tags(db=db, limit=limit)
    return [TagResponse.model_validate(t) for t in tags] 