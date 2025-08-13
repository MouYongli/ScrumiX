"""
Project management API routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as fastapi_status
from sqlalchemy.orm import Session

from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user
from scrumix.api.crud.project import project_crud
from scrumix.api.crud.user_project import user_project_crud
from scrumix.api.models.project import ProjectStatus
from scrumix.api.models.user_project import ScrumRole
from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(tags=["projects"])

@router.get("/me", response_model=List[ProjectResponse])
async def get_my_projects(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get projects for the current user"""
    try:
        # Get projects where the user is a member
        projects = project_crud.get_user_projects(db, current_user.id)
        
        # Convert to response format
        response_projects = []
        for project in projects:
            # Get user's role in the project
            user_role = user_project_crud.get_user_role(db, current_user.id, project.id)
            
            # Get project statistics
            project_stats = project_crud.get_project_with_user_role(db, project.id, current_user.id)
            
            project_response = ProjectResponse.from_db_model(
                project=project,
                progress=project_stats["progress"],
                members=project_stats["members_count"],
                tasks_completed=project_stats["tasks_completed"],
                tasks_total=project_stats["tasks_total"],
                user_role=user_role
            )
            response_projects.append(project_response)
        
        return response_projects
        
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, description="Filter by project status"),
    search: Optional[str] = Query(None, description="Search term"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of projects with optional filtering"""
    try:
        # Validate status parameter
        project_status = None
        if status and status != "all":
            valid_statuses = {s.value for s in ProjectStatus}
            if status not in valid_statuses:
                raise HTTPException(
                    status_code=fastapi_status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status}"
                )
            project_status = ProjectStatus(status)
        
        # Get user's projects
        if search:
            projects = project_crud.search_user_projects(db, current_user.id, search, skip=skip, limit=limit)
        else:
            projects = project_crud.get_user_projects(db, current_user.id, skip=skip, limit=limit, status=project_status)
        
        # Convert to response format
        response_projects = []
        for project in projects:
            # Get user's role in the project
            user_role = user_project_crud.get_user_role(db, current_user.id, project.id)
            
            # Get project statistics
            project_stats = project_crud.get_project_with_user_role(db, project.id, current_user.id)
            
            project_response = ProjectResponse.from_db_model(
                project=project,
                progress=project_stats["progress"],
                members=project_stats["members_count"],
                tasks_completed=project_stats["tasks_completed"],
                tasks_total=project_stats["tasks_total"],
                user_role=user_role
            )
            response_projects.append(project_response)
        
        return response_projects
        
    except ValueError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/", response_model=ProjectResponse, status_code=fastapi_status.HTTP_201_CREATED)
async def create_project(
    project_create: ProjectCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    try:
        # Check if project name already exists
        existing_project = project_crud.get_by_name(db, project_create.name)
        if existing_project:
            raise HTTPException(
                status_code=fastapi_status.HTTP_400_BAD_REQUEST,
                detail="Project name already exists"
            )
        
        # Create project with current user as owner
        project = project_crud.create_project(db, project_create, creator_id=current_user.id)
        
        # Get project statistics
        project_stats = project_crud.get_project_with_user_role(db, project.id, current_user.id)
        
        # Convert to response format
        project_response = ProjectResponse.from_db_model(
            project=project,
            progress=project_stats["progress"],
            members=project_stats["members_count"],
            tasks_completed=project_stats["tasks_completed"],
            tasks_total=project_stats["tasks_total"],
            user_role=ScrumRole.SCRUM_MASTER
        )
        
        return project_response
        
    except ValueError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details by ID"""
    try:
        # Get project with user role check
        project_stats = project_crud.get_project_with_user_role(db, project_id, current_user.id)
        if not project_stats:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Convert to response format
        project_response = ProjectResponse.from_db_model(
            project=project_stats["project"],
            progress=project_stats["progress"],
            members=project_stats["members_count"],
            tasks_completed=project_stats["tasks_completed"],
            tasks_total=project_stats["tasks_total"],
            user_role=project_stats["user_role"]
        )
        
        return project_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project information"""
    try:
        # Update project with user permission check
        updated_project = project_crud.update_project(db, project_id, project_update, current_user.id)
        if not updated_project:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Get project statistics
        project_stats = project_crud.get_project_with_user_role(db, project_id, current_user.id)
        
        # Convert to response format
        project_response = ProjectResponse.from_db_model(
            project=updated_project,
            progress=project_stats["progress"],
            members=project_stats["members_count"],
            tasks_completed=project_stats["tasks_completed"],
            tasks_total=project_stats["tasks_total"],
            user_role=project_stats["user_role"]
        )
        
        return project_response
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project"""
    try:
        success = project_crud.delete_project(db, project_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/status/{status}", response_model=List[ProjectResponse])
async def get_projects_by_status(
    status: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get projects by status"""
    try:
        # Convert status parameter
        project_status = ProjectStatus(status.replace("-", "_").upper())
        
        # Get user's projects with status filter
        projects = project_crud.get_user_projects(
            db, 
            current_user.id, 
            skip=skip, 
            limit=limit, 
            status=project_status
        )
        
        # Convert to response format
        response_projects = []
        for project in projects:
            # Get user's role and project statistics
            project_stats = project_crud.get_project_with_user_role(db, project.id, current_user.id)
            
            project_response = ProjectResponse.from_db_model(
                project=project,
                progress=project_stats["progress"],
                members=project_stats["members_count"],
                tasks_completed=project_stats["tasks_completed"],
                tasks_total=project_stats["tasks_total"],
                user_role=project_stats["user_role"]
            )
            response_projects.append(project_response)
        
        return response_projects
        
    except ValueError:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}"
        )