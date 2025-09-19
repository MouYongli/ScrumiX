"""
Workspace API routes for dashboard and overview data
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as fastapi_status
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
        # Get user's projects with detailed information including member count
        projects_with_details = project_crud.get_user_projects_with_details(db, current_user.id, limit=100)
        projects = [p["project"] for p in projects_with_details]
        
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
        
        # Create project responses with member count
        project_responses = []
        for project_detail in projects_with_details[:5]:  # Top 5 projects
            project_response = ProjectResponse.from_orm(project_detail["project"])
            # Add member count to the response
            project_response_dict = project_response.dict()
            project_response_dict["member_count"] = project_detail["members_count"]
            project_response_dict["user_role"] = project_detail["user_role"].value if project_detail["user_role"] else None
            project_responses.append(project_response_dict)
        
        # Create meeting responses with participant count
        meeting_responses = []
        for meeting in upcoming_meetings[:5]:  # Top 5 meetings
            meeting_response = MeetingResponse.from_orm(meeting)
            # Add participant count to the response
            meeting_response_dict = meeting_response.dict()
            participant_count = len(meeting.meeting_participants) if hasattr(meeting, 'meeting_participants') and meeting.meeting_participants else 0
            meeting_response_dict["participant_count"] = participant_count
            meeting_responses.append(meeting_response_dict)
        
        return {
            "statistics": {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "upcoming_meetings": upcoming_meetings_count,
                "overall_progress": overall_progress
            },
            "projects": project_responses,
            "recent_tasks": [TaskResponse.from_orm(t) for t in recent_tasks[:10]],  # Top 10 tasks
            "upcoming_meetings": meeting_responses,  # Top 5 meetings with participant count
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
        # Get projects with detailed information including accurate member count
        projects_with_details = project_crud.get_user_projects_with_details(db, current_user.id, limit=100)
        
        # Convert to response format with additional data
        response_projects = []
        for project_detail in projects_with_details:
            project_response = ProjectResponse.from_orm(project_detail["project"])
            project_response_dict = project_response.dict()
            project_response_dict["member_count"] = project_detail["members_count"]
            project_response_dict["user_role"] = project_detail["user_role"].value if project_detail["user_role"] else None
            project_response_dict["progress"] = project_detail["progress"]
            project_response_dict["tasks_completed"] = project_detail["backlog_completed"]
            project_response_dict["tasks_total"] = project_detail["backlog_total"]
            response_projects.append(project_response_dict)
        
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

@router.get("/search")
async def search_workspace(
    query: str = Query(..., min_length=1, description="Search query"),
    entity_types: Optional[str] = Query(None, description="Comma-separated list of entity types to search (projects,tasks,meetings,backlogs,sprints)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unified search across all workspace entities"""
    try:
        # Parse entity types filter
        search_types = set()
        if entity_types:
            search_types = set(entity_types.split(','))
        else:
            search_types = {'projects', 'tasks', 'meetings', 'backlogs', 'sprints'}
        
        results = []
        
        # Search projects
        if 'projects' in search_types:
            projects = project_crud.search_user_projects(db, current_user.id, query, limit=limit)
            for project in projects:
                # Get user's role in the project
                user_role = user_project_crud.get_user_role(db, current_user.id, project.id)
                
                # Get project statistics
                project_stats = project_crud.get_project_with_user_role(db, project.id, current_user.id)
                
                results.append({
                    "id": project.id,
                    "title": project.name,
                    "type": "project",
                    "description": project.description,
                    "status": project.status.value,
                    "url": f"/project/{project.id}/dashboard",
                    "project_id": project.id,
                    "project_name": project.name,
                    "metadata": {
                        "progress": project_stats["progress"],
                        "members": project_stats["members_count"],
                        "tasks_completed": project_stats.get("backlog_completed", 0),
                        "tasks_total": project_stats.get("backlog_total", 0),
                        "user_role": user_role.value if user_role else None,
                        "start_date": project.start_date.isoformat() if project.start_date else None,
                        "end_date": project.end_date.isoformat() if project.end_date else None
                    }
                })
        
        # Search tasks
        if 'tasks' in search_types:
            # Get tasks from user's projects
            user_projects = project_crud.get_user_projects(db, current_user.id, limit=100)
            project_ids = [p.id for p in user_projects]
            
            for project_id in project_ids:
                project_tasks = task_crud.search_tasks_by_project(db, project_id, query, limit=limit//len(project_ids) + 1)
                for task in project_tasks:
                    # Get project name
                    project = next((p for p in user_projects if p.id == project_id), None)
                    project_name = project.name if project else "Unknown Project"
                    
                    results.append({
                        "id": task.id,
                        "title": task.title,
                        "type": "task",
                        "description": task.description,
                        "status": task.status.value if hasattr(task.status, 'value') else str(task.status),
                        "url": f"/project/{project_id}/kanban",
                        "project_id": project_id,
                        "project_name": project_name,
                        "metadata": {
                            "priority": task.priority.value if hasattr(task.priority, 'value') else str(task.priority),
                            "created_at": task.created_at.isoformat() if task.created_at else None,
                            "updated_at": task.updated_at.isoformat() if task.updated_at else None
                        }
                    })
        
        # Search meetings
        if 'meetings' in search_types:
            user_projects = project_crud.get_user_projects(db, current_user.id, limit=100)
            project_ids = [p.id for p in user_projects]
            
            for project_id in project_ids:
                project_meetings = meeting_crud.search_meetings_by_project(db, project_id, query, limit=limit//len(project_ids) + 1)
                for meeting in project_meetings:
                    # Get project name
                    project = next((p for p in user_projects if p.id == project_id), None)
                    project_name = project.name if project else "Unknown Project"
                    
                    results.append({
                        "id": meeting.id,
                        "title": meeting.title,
                        "type": "meeting",
                        "description": meeting.description,
                        "status": getattr(meeting, 'status', 'scheduled'),
                        "url": f"/project/{project_id}/meeting/{meeting.id}",
                        "project_id": project_id,
                        "project_name": project_name,
                        "metadata": {
                            "meeting_type": meeting.meeting_type,
                            "start_datetime": meeting.start_datetime.isoformat() if meeting.start_datetime else None,
                            "duration": meeting.duration,
                            "location": meeting.location
                        }
                    })
        
        # Search backlogs
        if 'backlogs' in search_types:
            user_projects = project_crud.get_user_projects(db, current_user.id, limit=100)
            project_ids = [p.id for p in user_projects]
            
            # Search backlogs across all user projects
            from scrumix.api.crud.backlog import backlog_crud
            
            for project_id in project_ids:
                project_backlogs = backlog_crud.search_backlogs_by_project(db, project_id, query, limit=limit//len(project_ids) + 1)
                for backlog in project_backlogs:
                    # Get project name
                    project = next((p for p in user_projects if p.id == project_id), None)
                    project_name = project.name if project else "Unknown Project"
                    
                    results.append({
                        "id": backlog.id,
                        "title": backlog.title,
                        "type": "backlog",
                        "description": backlog.description,
                        "status": backlog.status.value if hasattr(backlog.status, 'value') else str(backlog.status),
                        "url": f"/project/{project_id}/backlog",
                        "project_id": project_id,
                        "project_name": project_name,
                        "metadata": {
                            "item_type": backlog.item_type.value if hasattr(backlog.item_type, 'value') else str(backlog.item_type),
                            "priority": backlog.priority.value if hasattr(backlog.priority, 'value') else str(backlog.priority),
                            "story_point": backlog.story_point,
                            "assigned_to_id": backlog.assigned_to_id
                        }
                    })
        
        # Search sprints
        if 'sprints' in search_types:
            user_projects = project_crud.get_user_projects(db, current_user.id, limit=100)
            project_ids = [p.id for p in user_projects]
            
            for project_id in project_ids:
                project_sprints = sprint_crud.search_sprints_by_project(db, project_id, query, limit=limit//len(project_ids) + 1)
                for sprint in project_sprints:
                    # Get project name
                    project = next((p for p in user_projects if p.id == project_id), None)
                    project_name = project.name if project else "Unknown Project"
                    
                    results.append({
                        "id": sprint.id,
                        "title": sprint.sprint_name,
                        "type": "sprint",
                        "description": sprint.sprint_goal,
                        "status": sprint.status.value if hasattr(sprint.status, 'value') else str(sprint.status),
                        "url": f"/project/{project_id}/sprint/{sprint.id}",
                        "project_id": project_id,
                        "project_name": project_name,
                        "metadata": {
                            "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
                            "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
                            "sprint_capacity": sprint.sprint_capacity
                        }
                    })
        
        # Sort results by relevance (exact title matches first, then partial matches)
        def sort_key(result):
            title_lower = result['title'].lower()
            query_lower = query.lower()
            
            # Exact match gets highest priority
            if title_lower == query_lower:
                return (0, result['title'])
            # Title starts with query gets second priority
            elif title_lower.startswith(query_lower):
                return (1, result['title'])
            # Title contains query gets third priority
            elif query_lower in title_lower:
                return (2, result['title'])
            # Description contains query gets lowest priority
            else:
                return (3, result['title'])
        
        sorted_results = sorted(results, key=sort_key)[:limit]
        
        return {
            "results": sorted_results,
            "total": len(sorted_results),
            "query": query,
            "entity_types": list(search_types)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


