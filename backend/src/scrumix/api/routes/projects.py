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
from scrumix.api.models.project import ProjectStatus
from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(tags=["projects"])

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
        
        # Execute search or get project list
        if search:
            projects = project_crud.search_projects(db, search, skip=skip, limit=limit)
        else:
            projects = project_crud.get_projects(db, skip, limit, project_status)
        
        # Convert to response format
        response_projects = []
        for project in projects:
            # TODO: Calculate actual progress, member count and task statistics
            # Currently using default values, will be retrieved from database when relationships are added
            project_response = ProjectResponse.from_db_model(
                project=project,
                progress=0,  # Calculate from task relationships
                members=1,   # Calculate from project member relationships
                tasks_completed=0,  # Calculate from task relationships
                tasks_total=0       # Calculate from task relationships
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
        
        # Create project
        project = project_crud.create_project(db, project_create)
        
        # Convert to response format
        project_response = ProjectResponse.from_db_model(
            project=project,
            progress=0,
            members=1,
            tasks_completed=0,
            tasks_total=0
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
    project = project_crud.get_by_id(db, project_id)
    if not project:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Calculate project statistics from relationships
    # 1. Count project members
    members_count = len(project.user_projects)
    
    # 2. Count tasks and story points across all project sprints
    tasks_total = 0
    tasks_completed = 0
    story_points_total = 0
    story_points_completed = 0
    
    for sprint in project.sprints:
        for task in sprint.tasks:
            tasks_total += 1
            story_points = task.story_point or 0
            story_points_total += story_points
            
            if task.status.value == "done":
                tasks_completed += 1
                story_points_completed += story_points
    
    # 3. Calculate progress percentage (prefer story points over task count)
    if story_points_total > 0:
        progress = int((story_points_completed / story_points_total * 100))
    elif tasks_total > 0:
        progress = int((tasks_completed / tasks_total * 100))
    else:
        progress = 0
    
    # Convert to response format
    project_response = ProjectResponse.from_db_model(
        project=project,
        progress=progress,
        members=members_count,
        tasks_completed=tasks_completed,
        tasks_total=tasks_total
    )
    
    return project_response

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project information"""
    try:
        updated_project = project_crud.update_project(db, project_id, project_update)
        if not updated_project:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Calculate project statistics from relationships (same as in get_project)
        # 1. Count project members
        members_count = len(updated_project.user_projects)
        
        # 2. Count tasks and story points across all project sprints
        tasks_total = 0
        tasks_completed = 0
        story_points_total = 0
        story_points_completed = 0
        
        for sprint in updated_project.sprints:
            for task in sprint.tasks:
                tasks_total += 1
                story_points = task.story_point or 0
                story_points_total += story_points
                
                if task.status.value == "done":
                    tasks_completed += 1
                    story_points_completed += story_points
        
        # 3. Calculate progress percentage (prefer story points over task count)
        if story_points_total > 0:
            progress = int((story_points_completed / story_points_total * 100))
        elif tasks_total > 0:
            progress = int((tasks_completed / tasks_total * 100))
        else:
            progress = 0
        
        # Convert to response format
        project_response = ProjectResponse.from_db_model(
            project=updated_project,
            progress=progress,
            members=members_count,
            tasks_completed=tasks_completed,
            tasks_total=tasks_total
        )
        
        return project_response
        
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
    success = project_crud.delete_project(db, project_id)
    if not success:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return {"message": "Project deleted successfully"}

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
        
        projects = project_crud.get_projects_by_status(db, project_status, skip=skip, limit=limit)
        
        # Convert to response format
        response_projects = []
        for project in projects:
            project_response = ProjectResponse.from_db_model(
                project=project,
                progress=0,
                members=1,
                tasks_completed=0,
                tasks_total=0
            )
            response_projects.append(project_response)
        
        return response_projects
        
    except ValueError:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}"
        ) 