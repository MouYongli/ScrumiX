"""
Workspace API routes for dashboard and overview data
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status as fastapi_status
from sqlalchemy.orm import Session

from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user
from scrumix.api.crud.project import project_crud
from scrumix.api.crud.task import task_crud
from scrumix.api.crud.meeting import meeting_crud
from scrumix.api.crud.sprint import sprint_crud
from scrumix.api.crud.user_project import user_project_crud
from scrumix.api.schemas.project import ProjectResponse
from scrumix.api.schemas.task import TaskResponse
from scrumix.api.schemas.meeting import MeetingResponse
from scrumix.api.schemas.sprint import SprintResponse

router = APIRouter(tags=["workspace"])

@router.get("/overview")
async def get_workspace_overview(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workspace overview data for the current user"""
    try:
        # Get user's projects
        projects = project_crud.get_user_projects(db, current_user.id, limit=100)
        
        # Get user's tasks (recent and assigned)
        recent_tasks = task_crud.get_recent_tasks(db, current_user.id, limit=20)
        
        # Get upcoming meetings
        upcoming_meetings = meeting_crud.get_upcoming_meetings(db, current_user.id, days=7)
        
        # Get active sprints
        active_sprints = sprint_crud.get_active_sprints(db, current_user.id)
        
        # Calculate workspace statistics
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.status.value == "active"])
        total_tasks = len(recent_tasks)
        completed_tasks = len([t for t in recent_tasks if t.status.value == "done"])
        upcoming_meetings_count = len(upcoming_meetings)
        
        # Calculate overall progress
        overall_progress = 0
        if total_tasks > 0:
            overall_progress = int((completed_tasks / total_tasks) * 100)
        
        return {
            "statistics": {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "upcoming_meetings": upcoming_meetings_count,
                "overall_progress": overall_progress
            },
            "projects": [ProjectResponse.from_orm(p) for p in projects[:5]],  # Top 5 projects
            "recent_tasks": [TaskResponse.from_orm(t) for t in recent_tasks[:10]],  # Top 10 tasks
            "upcoming_meetings": [MeetingResponse.from_orm(m) for m in upcoming_meetings[:5]],  # Top 5 meetings
            "active_sprints": [SprintResponse.from_orm(s) for s in active_sprints[:3]]  # Top 3 sprints
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/projects")
async def get_workspace_projects(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects for the current user's workspace"""
    try:
        projects = project_crud.get_user_projects(db, current_user.id, limit=100)
        
        # Convert to response format with additional data
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

@router.get("/tasks")
async def get_workspace_tasks(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks for the current user's workspace"""
    try:
        # Get tasks from user's projects
        user_projects = project_crud.get_user_projects(db, current_user.id, limit=100)
        project_ids = [p.id for p in user_projects]
        
        # Get tasks from these projects
        all_tasks = []
        for project_id in project_ids:
            project_tasks = task_crud.get_tasks_by_project(db, project_id, limit=100)
            all_tasks.extend(project_tasks)
        
        # Sort by creation date (most recent first)
        all_tasks.sort(key=lambda x: x.created_at, reverse=True)
        
        return [TaskResponse.from_orm(t) for t in all_tasks]
        
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/meetings")
async def get_workspace_meetings(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all meetings for the current user's workspace"""
    try:
        # Get meetings from user's projects
        user_projects = project_crud.get_user_projects(db, current_user.id, limit=100)
        project_ids = [p.id for p in user_projects]
        
        # Get meetings from these projects
        all_meetings = []
        for project_id in project_ids:
            project_meetings = meeting_crud.get_meetings_by_project(db, project_id, limit=100)
            all_meetings.extend(project_meetings)
        
        # Sort by start date (most recent first)
        all_meetings.sort(key=lambda x: x.start_datetime, reverse=True)
        
        return [MeetingResponse.from_orm(m) for m in all_meetings]
        
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


