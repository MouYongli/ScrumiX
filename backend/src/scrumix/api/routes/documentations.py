"""
Documentation-related API routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as fastapi_status
from sqlalchemy.orm import Session

from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user
from scrumix.api.schemas.user import UserInDB
from scrumix.api.schemas.documentation import (
    DocumentationCreate, 
    DocumentationUpdate, 
    DocumentationResponse
)
from scrumix.api.models.documentation import DocumentationType
from scrumix.api.crud.documentation import documentation_crud

router = APIRouter()

@router.get("/", response_model=List[DocumentationResponse])
def get_documentations(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    doc_type: Optional[DocumentationType] = Query(None, description="Filter by documentation type"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get list of documentation items with optional filtering and search
    """
    try:
        if search:
            documentations = documentation_crud.search_documentations(db, search, skip, limit, project_id)
        else:
            documentations = documentation_crud.get_documentations(db, skip, limit, doc_type, project_id)
        
        return [
            DocumentationResponse.from_db_model(doc) 
            for doc in documentations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documentation: {str(e)}")

@router.post("/", response_model=DocumentationResponse, status_code=fastapi_status.HTTP_201_CREATED)
def create_documentation(
    documentation_create: DocumentationCreate,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Create new documentation item
    """
    try:
        documentation = documentation_crud.create_documentation(db, documentation_create)
        return DocumentationResponse.from_db_model(documentation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating documentation: {str(e)}")

@router.get("/{doc_id}", response_model=DocumentationResponse)
def get_documentation_by_id(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get documentation item by ID
    """
    documentation = documentation_crud.get_by_id(db, doc_id)
    if not documentation:
        raise HTTPException(status_code=404, detail="Documentation not found")
    
    return DocumentationResponse.from_db_model(documentation)

@router.put("/{doc_id}", response_model=DocumentationResponse)
def update_documentation(
    doc_id: int,
    documentation_update: DocumentationUpdate,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update documentation item
    """
    try:
        documentation = documentation_crud.update_documentation(db, doc_id, documentation_update)
        if documentation is None:
            raise HTTPException(status_code=404, detail="Documentation not found")
        
        return DocumentationResponse.from_db_model(documentation)
    except HTTPException:
        raise  # Re-raise HTTPExceptions (like 404) without catching them
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating documentation: {str(e)}")

@router.delete("/{doc_id}")
def delete_documentation(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Delete documentation item
    """
    success = documentation_crud.delete_documentation(db, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Documentation not found")
    
    return {"message": "Documentation deleted successfully"}

@router.get("/type/{doc_type}", response_model=List[DocumentationResponse])
def get_documentations_by_type(
    doc_type: DocumentationType,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),

    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get documentation items by type
    """
    try:
        documentations = documentation_crud.get_documentations_by_type(db, doc_type, skip=skip, limit=limit)
        return [
            DocumentationResponse.from_db_model(doc) 
            for doc in documentations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documentation by type: {str(e)}")

@router.get("/search/file-url", response_model=List[DocumentationResponse])
def search_documentation_by_file_url(
    search_term: str = Query(..., description="Search term for file URL"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Search documentation items by file URL pattern
    """
    try:
        documentations = documentation_crud.search_by_file_url(db, search_term, skip=skip, limit=limit)
        return [
            DocumentationResponse.from_db_model(doc) 
            for doc in documentations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching documentation by file URL: {str(e)}")

@router.get("/recent/updates", response_model=List[DocumentationResponse])
def get_recent_documentations(
    days: int = Query(7, ge=1, le=30, description="Number of days to look back"),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get recently created or updated documentation items
    """
    try:
        documentations = documentation_crud.get_recent_documentations(db, days=days, limit=limit)
        return [
            DocumentationResponse.from_db_model(doc) 
            for doc in documentations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent documentation: {str(e)}")

@router.get("/statistics/overview")
def get_documentation_statistics(
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get documentation statistics and overview
    """
    try:
        stats = documentation_crud.get_documentation_statistics(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documentation statistics: {str(e)}") 

@router.get("/project/{project_id}", response_model=List[DocumentationResponse])
def get_documentations_by_project(
    project_id: int,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    doc_type: Optional[DocumentationType] = Query(None, description="Filter by documentation type"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get documentation items for a specific project
    """
    try:
        if search:
            documentations = documentation_crud.search_documentations(db, search, skip, limit, project_id)
        else:
            documentations = documentation_crud.get_documentations(db, skip, limit, doc_type, project_id)
        
        return [
            DocumentationResponse.from_db_model(doc) 
            for doc in documentations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project documentation: {str(e)}") 

@router.get("/project/{project_id}/users", response_model=List[dict])
def get_project_users_for_documentation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get project users for author selection in documentation
    """
    try:
        users = documentation_crud.get_project_users(db, project_id)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project users: {str(e)}") 