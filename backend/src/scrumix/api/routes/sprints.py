"""
Sprint-related API routes
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user
from scrumix.api.schemas.user import UserInDB
from scrumix.api.schemas.sprint import (
    SprintCreate, 
    SprintUpdate, 
    SprintResponse
)
from scrumix.api.models.sprint import SprintStatus
from scrumix.api.crud.sprint import sprint_crud
from scrumix.api.crud.sprint_backlog import sprint_backlog_crud
from scrumix.api.utils.notification_helpers import notification_helper
from scrumix.api.models.backlog import Backlog
from scrumix.api.models.task import Task
from scrumix.api.models.sprint import Sprint

router = APIRouter()

@router.get("/", response_model=List[SprintResponse])
def get_sprints(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status: Optional[SprintStatus] = Query(None, description="Filter by sprint status"),
    project_id: Optional[int] = Query(None, gt=0, description="Filter by project ID"),
    search: Optional[str] = Query(None, description="Search in sprint name and goal"),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get list of sprints with optional filtering and search
    """
    try:
        if search:
            sprints = sprint_crud.search_sprints(db, search, skip=skip, limit=limit)
        else:
            sprints = sprint_crud.get_sprints(db, skip=skip, limit=limit, status=status, project_id=project_id)
        
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprints: {str(e)}")

@router.post("/", response_model=SprintResponse, status_code=201)
def create_sprint(
    sprint_create: SprintCreate,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Create new sprint
    """
    try:
        sprint = sprint_crud.create_sprint(db, sprint_create)
        return SprintResponse.from_db_model(sprint)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sprint: {str(e)}")

@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint_by_id(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprint by ID
    """
    sprint = sprint_crud.get_by_id(db, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    return SprintResponse.from_db_model(sprint)

@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    sprint_id: int,
    sprint_update: SprintUpdate,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update sprint
    """
    # Get the current sprint to check for status changes
    current_sprint = sprint_crud.get_by_id(db, sprint_id)
    if not current_sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    old_status = current_sprint.status
    
    # Update the sprint
    sprint = sprint_crud.update_sprint(db, sprint_id, sprint_update)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    # Check if status changed to ACTIVE (sprint started)
    if (old_status != SprintStatus.ACTIVE and 
        sprint.status == SprintStatus.ACTIVE):
        try:
            notification_helper.create_sprint_started_notification(
                db=db,
                sprint_id=sprint.id,
                sprint_name=sprint.sprint_name,
                sprint_goal=sprint.sprint_goal,
                start_date=sprint.start_date,
                end_date=sprint.end_date,
                project_id=sprint.project_id,
                started_by_user_id=current_user.id
            )
        except Exception as e:
            # Log the error but don't fail the sprint update
            print(f"Failed to create sprint started notification: {e}")
    
    return SprintResponse.from_db_model(sprint)

@router.delete("/{sprint_id}", status_code=204)
def delete_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Delete sprint
    """
    success = sprint_crud.delete_sprint(db, sprint_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    return None

@router.get("/status/{status}", response_model=List[SprintResponse])
def get_sprints_by_status(
    status: SprintStatus,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprints by status
    """
    try:
        sprints = sprint_crud.get_sprints_by_status(db, status, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprints by status: {str(e)}")

@router.get("/active/current", response_model=List[SprintResponse])
def get_active_sprints(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get currently active sprints
    """
    try:
        sprints = sprint_crud.get_active_sprints(db, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching active sprints: {str(e)}")

@router.get("/upcoming/scheduled", response_model=List[SprintResponse])
def get_upcoming_sprints(
    days_ahead: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get upcoming sprints within specified days
    """
    try:
        sprints = sprint_crud.get_upcoming_sprints(db, days_ahead=days_ahead, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching upcoming sprints: {str(e)}")

@router.get("/range/dates", response_model=List[SprintResponse])
def get_sprints_by_date_range(
    start_date: datetime = Query(..., description="Start date for range filter"),
    end_date: datetime = Query(..., description="End date for range filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprints within a date range
    """
    try:
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        sprints = sprint_crud.get_sprints_by_date_range(db, start_date, end_date, skip=skip, limit=limit)
        return [
            SprintResponse.from_db_model(sprint) 
            for sprint in sprints
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprints by date range: {str(e)}")

@router.post("/{sprint_id}/start", response_model=SprintResponse)
def start_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Start a sprint (change status to active)
    """
    try:
        sprint = sprint_crud.start_sprint(db, sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        return SprintResponse.from_db_model(sprint)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting sprint: {str(e)}")

@router.post("/{sprint_id}/close", response_model=SprintResponse)
def close_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Close/complete a sprint
    """
    try:
        sprint = sprint_crud.close_sprint(db, sprint_id)
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        return SprintResponse.from_db_model(sprint)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error closing sprint: {str(e)}")

@router.get("/statistics/overview")
def get_sprint_statistics(
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get sprint statistics and overview
    """
    try:
        stats = sprint_crud.get_sprint_statistics(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprint statistics: {str(e)}")

@router.get("/{sprint_id}/project-users", response_model=List[dict])
def get_project_users_for_tasks(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get all users in the project for task assignment
    """
    try:
        # Get the sprint to find the project_id
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        # Check if current user has access to the project
        from scrumix.api.crud.user_project import user_project_crud
        current_user_role = user_project_crud.get_user_role(db, current_user.id, sprint.project_id)
        if not current_user_role:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this project"
            )
        
        # Get project members
        from scrumix.api.crud.user_project import user_project_crud
        members_data = user_project_crud.get_project_members(db, sprint.project_id)
        
        # Convert to response format
        users_response = []
        for member_data in members_data:
            user = member_data["user"]
            role = member_data["role"]
            
            users_response.append({
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "role": role.value
            })
        
        return users_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project users: {str(e)}")


# Sprint Backlog Management Endpoints

@router.get("/{sprint_id}/backlog", response_model=List[dict])
def get_sprint_backlog(
    sprint_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get all backlog items assigned to a specific sprint
    """
    try:
        backlog_items = sprint_backlog_crud.get_sprint_backlog_items(
            db, sprint_id, skip=skip, limit=limit
        )
        
        # Convert to response format with tasks
        result = []
        for item in backlog_items:
            item_data = {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "status": item.status.value,
                "priority": item.priority.value,
                "story_point": item.story_point,  
                "label": item.label,
                "item_type": item.item_type.value,
                "project_id": item.project_id,
                "sprint_id": item.sprint_id,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "acceptance_criteria": [
                    {
                        "id": ac.id,
                        "title": ac.title,
                        "description": ac.description,
                        "is_met": ac.is_met,
                        "created_at": ac.created_at,
                        "updated_at": ac.updated_at
                    }
                    for ac in item.acceptance_criteria
                ],
                "tasks": [
                    {
                        "id": task.id,
                        "title": task.title,
                        "description": task.description,
                        "status": task.status.value,
                        "priority": task.priority.value,  
                        "created_at": task.created_at,
                        "updated_at": task.updated_at,
                        "assignees": [
                            {
                                "id": ut.user.id,
                                "username": ut.user.username,
                                "full_name": ut.user.full_name,
                                "email": ut.user.email
                            }
                            for ut in task.user_tasks
                        ]
                    }
                    for task in item.tasks
                ]
            }
            result.append(item_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprint backlog: {str(e)}")

@router.get("/{sprint_id}/backlog/available", response_model=List[dict])
def get_available_backlog_items(
    sprint_id: int,
    project_id: int = Query(..., gt=0),
    item_type: Optional[str] = Query(None, description="Filter by item type (story, bug, epic, etc.)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get backlog items that are not assigned to any sprint (available for selection)
    """
    try:
        # Validate item_type if provided
        if item_type:
            valid_types = ['epic', 'story', 'task', 'bug', 'feature', 'improvement']
            if item_type not in valid_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid item_type. Must be one of: {', '.join(valid_types)}"
                )
        
        # Log the request parameters for debugging
        
        available_items = sprint_backlog_crud.get_available_backlog_items(
            db, project_id, None, item_type, skip=skip, limit=limit
        )
        
        
        # Convert to response format
        result = []
        for item in available_items:
            item_data = {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "status": item.status.value,
                "priority": item.priority.value,
                "story_point": item.story_point,  # Add missing story_point field
                "label": item.label,
                "item_type": item.item_type.value,
                "project_id": item.project_id,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "acceptance_criteria": [
                    {
                        "id": ac.id,
                        "title": ac.title,
                        "description": ac.description,
                        "is_met": ac.is_met,
                        "created_at": ac.created_at,
                        "updated_at": ac.updated_at
                    }
                    for ac in item.acceptance_criteria
                ]
            }
            result.append(item_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching available backlog items: {str(e)}")

@router.post("/{sprint_id}/backlog/{backlog_id}", response_model=dict)
def add_backlog_item_to_sprint(
    sprint_id: int,
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Add a backlog item to a sprint
    """
    try:
        backlog_item = sprint_backlog_crud.add_backlog_item_to_sprint(
            db, sprint_id, backlog_id
        )
        if not backlog_item:
            raise HTTPException(status_code=404, detail="Backlog item not found")
        
        return {
            "message": "Backlog item added to sprint successfully",
            "backlog_item_id": backlog_item.id,
            "sprint_id": sprint_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding backlog item to sprint: {str(e)}")

@router.put("/{sprint_id}/backlog/{backlog_id}/status", response_model=dict)
def update_backlog_item_status(
    sprint_id: int,
    backlog_id: int,
    status_data: dict,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update the status of a backlog item with validation based on task completion
    """
    try:
        from ..models.backlog import Backlog, BacklogStatus
        from ..models.task import Task, TaskStatus
        
        # Validate the new status
        new_status = status_data.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Status is required")
        
        try:
            new_status_enum = BacklogStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in BacklogStatus])}"
            )
        
        # Get the backlog item
        backlog_item = db.query(Backlog).filter(
            Backlog.id == backlog_id,
            Backlog.sprint_id == sprint_id
        ).first()
        
        if not backlog_item:
            raise HTTPException(status_code=404, detail="Backlog item not found in this sprint")
        
        # Check if the status change requires task completion validation
        if new_status_enum in [BacklogStatus.IN_REVIEW, BacklogStatus.DONE]:
            # Get all tasks for this backlog item
            tasks = db.query(Task).filter(Task.backlog_id == backlog_id).all()
            
            if not tasks:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot set status to '{new_status}' because this backlog item has no tasks. Please add at least one task first."
                )
            
            # Check if all tasks are done
            incomplete_tasks = [task for task in tasks if task.status != TaskStatus.DONE]
            if incomplete_tasks:
                incomplete_task_titles = [task.title for task in incomplete_tasks[:3]]  # Show max 3 task titles
                task_list = ", ".join(incomplete_task_titles)
                if len(incomplete_tasks) > 3:
                    task_list += f" and {len(incomplete_tasks) - 3} more"
                
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot set status to '{new_status}' because not all tasks are completed. Incomplete tasks: {task_list}"
                )
        
        # Update the backlog item status
        backlog_item.status = new_status_enum
        db.commit()
        db.refresh(backlog_item)
        
        return {
            "message": "Backlog item status updated successfully",
            "backlog_item_id": backlog_id,
            "new_status": new_status,
            "sprint_id": sprint_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating backlog item status: {str(e)}")

@router.delete("/{sprint_id}/backlog/{backlog_id}")
def remove_backlog_item_from_sprint(
    sprint_id: int,
    backlog_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Remove a backlog item from a sprint (and delete associated tasks)
    """
    try:
        success = sprint_backlog_crud.remove_backlog_item_from_sprint(
            db, sprint_id, backlog_id
        )
        if not success:
            raise HTTPException(status_code=404, detail="Backlog item not found in sprint")
        
        return {
            "message": "Backlog item removed from sprint successfully",
            "backlog_item_id": backlog_id,
            "sprint_id": sprint_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing backlog item from sprint: {str(e)}")

@router.post("/{sprint_id}/backlog/{backlog_id}/tasks", response_model=dict)
def create_task_for_backlog_item(
    sprint_id: int,
    backlog_id: int,
    task_data: dict,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Create a new task for a backlog item in a sprint
    """
    try:
        # Validate that the backlog item is in this sprint
        backlog_item = db.query(Backlog).filter(
            Backlog.id == backlog_id,
            Backlog.sprint_id == sprint_id
        ).first()
        
        if not backlog_item:
            raise HTTPException(status_code=404, detail="Backlog item not found in sprint")
        
        # Create task
        task = sprint_backlog_crud.create_task_for_backlog_item(
            db, task_data, backlog_id, sprint_id
        )
        
        return {
            "message": "Task created successfully",
            "task_id": task.id,
            "backlog_id": backlog_id,
            "sprint_id": sprint_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.put("/{sprint_id}/tasks/{task_id}", response_model=dict)
def update_task(
    sprint_id: int,
    task_id: int,
    task_data: dict,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update an existing task in a sprint
    """
    try:
        # Validate that the task belongs to this sprint
        task = db.query(Task).filter(
            Task.id == task_id,
            Task.sprint_id == sprint_id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found in sprint")
        
        # Update task
        updated_task = sprint_backlog_crud.update_task(db, task_id, task_data)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "message": "Task updated successfully",
            "task_id": task_id,
            "sprint_id": sprint_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")

@router.delete("/{sprint_id}/tasks/{task_id}")
def delete_task(
    sprint_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Delete a task from a sprint
    """
    try:
        # Validate that the task belongs to this sprint
        task = db.query(Task).filter(
            Task.id == task_id,
            Task.sprint_id == sprint_id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found in sprint")
        
        # Delete task
        success = sprint_backlog_crud.delete_task(db, task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "message": "Task deleted successfully",
            "task_id": task_id,
            "sprint_id": sprint_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")

@router.get("/{sprint_id}/statistics")
def get_sprint_backlog_statistics(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get detailed statistics for a specific sprint
    """
    try:
        stats = sprint_backlog_crud.get_sprint_statistics(db, sprint_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sprint statistics: {str(e)}") 