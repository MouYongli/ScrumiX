"""
Project management API routes
"""
from typing import List, Optional, Dict
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
from scrumix.api.schemas.user_project import ProjectMemberResponse, UserProjectCreate, UserProjectUpdate
from scrumix.api.schemas.meeting import MeetingResponse

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

@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
async def get_project_members(
    project_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a project"""
    try:
        # Check if user has access to the project
        user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        if not user_role:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Get project members
        members_data = user_project_crud.get_project_members(db, project_id)
        
        # Convert to response format
        members_response = []
        for member_data in members_data:
            user = member_data["user"]
            role = member_data["role"]
            
            # Check if user is admin (superuser or project creator)
            is_admin = user.is_superuser or (
                user_project_crud.get_user_role(db, user.id, project_id) == ScrumRole.PRODUCT_OWNER
            )
            
            member_response = ProjectMemberResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                role=role,
                joined_at=user.created_at,  # Using user creation date as joined date
                is_admin=is_admin
            )
            members_response.append(member_response)
        
        return members_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def invite_project_member(
    project_id: int,
    member_data: UserProjectCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a new member to the project"""
    try:
        # Check if current user has permission to invite members
        current_user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        if not current_user_role or current_user_role not in [ScrumRole.PRODUCT_OWNER, ScrumRole.SCRUM_MASTER]:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Only Product Owners and Scrum Masters can invite members"
            )
        
        # Check if user exists
        from scrumix.api.crud.user import user_crud
        user = user_crud.get(db, member_data.user_id)
        if not user:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if user is already a member of the project
        existing_membership = user_project_crud.get_user_role(db, member_data.user_id, project_id)
        if existing_membership:
            raise HTTPException(
                status_code=fastapi_status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this project"
            )
        
        # Add user to project
        user_project = user_project_crud.add_user_to_project(
            db, 
            member_data.user_id, 
            project_id, 
            member_data.role
        )
        
        # Get the user details for response
        user = user_crud.get(db, member_data.user_id)
        
        # Check if user is admin
        is_admin = user.is_superuser or (member_data.role == ScrumRole.PRODUCT_OWNER)
        
        return ProjectMemberResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user_project.role,
            joined_at=user_project.created_at,
            is_admin=is_admin
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{project_id}/available-users")
async def get_available_users(
    project_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users available to invite to the project"""
    try:
        # Check if current user has access to the project
        current_user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        if not current_user_role:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Get all users
        from scrumix.api.crud.user import user_crud
        all_users = user_crud.get_multi(db)
        
        # Get current project members
        current_members = user_project_crud.get_project_members(db, project_id)
        current_member_ids = {member["user"].id for member in current_members}
        
        # Filter out users already in the project
        available_users = [
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url
            }
            for user in all_users
            if user.id not in current_member_ids
        ]
        
        return available_users
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: int,
    user_id: int,
    member_update: UserProjectUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project member's role"""
    try:
        # Check if current user has permission to update members
        current_user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        if not current_user_role or current_user_role not in [ScrumRole.PRODUCT_OWNER, ScrumRole.SCRUM_MASTER]:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Only Product Owners and Scrum Masters can update member roles"
            )
        
        # Check if target user is a member of the project
        existing_membership = user_project_crud.get_user_role(db, user_id, project_id)
        if not existing_membership:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this project"
            )
        
        # Prevent users from changing their own role (except Product Owners)
        if user_id == current_user.id and current_user_role != ScrumRole.PRODUCT_OWNER:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You cannot change your own role"
            )
        
        # Update the user's role
        user_project = user_project_crud.update_user_role(
            db, 
            user_id, 
            project_id, 
            member_update.role
        )
        
        # Get the user details for response
        from scrumix.api.crud.user import user_crud
        user = user_crud.get(db, user_id)
        
        # Check if user is admin
        is_admin = user.is_superuser or (member_update.role == ScrumRole.PRODUCT_OWNER)
        
        return ProjectMemberResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user_project.role,
            joined_at=user_project.created_at,
            is_admin=is_admin
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: int,
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from the project"""
    try:
        # Check if current user has permission to remove members
        current_user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        if not current_user_role or current_user_role not in [ScrumRole.PRODUCT_OWNER, ScrumRole.SCRUM_MASTER]:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Only Product Owners and Scrum Masters can remove members"
            )
        
        # Check if target user is a member of the project
        existing_membership = user_project_crud.get_user_role(db, user_id, project_id)
        if not existing_membership:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this project"
            )
        
        # Prevent users from removing themselves (except Product Owners)
        if user_id == current_user.id and current_user_role != ScrumRole.PRODUCT_OWNER:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You cannot remove yourself from the project"
            )
        
        # Remove the user from the project
        success = user_project_crud.remove_user_from_project(db, user_id, project_id)
        
        if not success:
            raise HTTPException(
                status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove user from project"
            )
        
        return {"message": "User removed from project successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{project_id}/meetings", response_model=List[MeetingResponse])
async def get_project_meetings(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meetings for a specific project"""
    try:
        # Check if user is a member of the project
        user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        if not user_role:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this project"
            )
        
        # Import meeting CRUD
        from scrumix.api.crud.meeting import meeting_crud
        
        # Get meetings for the project
        meetings = meeting_crud.get_meetings_by_project(db, project_id, skip=skip, limit=limit)
        
        # Convert to response format using Pydantic schema
        return [MeetingResponse.model_validate(meeting) for meeting in meetings]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )