from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math

from ..core.security import get_current_user
from ..db.session import get_db
from ..models.user import User
from ..models.task import TaskStatus
from ..schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse
)
from ..crud.task import task_crud
from ..utils.notification_helpers import notification_helper

router = APIRouter()


@router.get("/", response_model=TaskListResponse)
def get_tasks(
    skip: int = Query(0, ge=0, description="Number of tasks to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of tasks to return"),
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tasks with pagination and optional filtering."""
    tasks, total = task_crud.get_multi_with_pagination(
        db, skip=skip, limit=limit, status=status, search=search
    )
    
    pages = math.ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return TaskListResponse(
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=current_page,
        pages=pages
    )


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task."""
    db_task = task_crud.create(db=db, obj_in=task_in)
    return TaskResponse.model_validate(db_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific task by ID."""
    db_task = task_crud.get(db=db, id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(db_task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific task."""
    db_task = task_crud.get(db=db, id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Store old status for notification comparison
    old_status = db_task.status.value if db_task.status else None
    
    # Update the task
    db_task = task_crud.update(db=db, db_obj=db_task, obj_in=task_in)
    
    # Create notifications for status changes
    if task_in.status and old_status and task_in.status != old_status:
        try:
            # Get assigned users for notifications
            assigned_user_ids = [user.id for user in db_task.users]
            
            notification_helper.create_task_status_changed_notification(
                db=db,
                task_id=db_task.id,
                task_title=db_task.title,
                old_status=old_status,
                new_status=task_in.status,
                changed_by_user_id=current_user.id,
                project_id=db_task.backlog.project_id if db_task.backlog else None,
                assigned_user_ids=assigned_user_ids,
                sprint_id=db_task.sprint_id
            )
        except Exception as e:
            # Log the error but don't fail the task update
            print(f"Failed to create task status change notification: {e}")
    
    return TaskResponse.model_validate(db_task)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific task."""
    db_task = task_crud.get(db=db, id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_crud.remove(db=db, id=task_id)
    return {"message": "Task deleted successfully"}


@router.get("/status/{status}", response_model=List[TaskResponse])
def get_tasks_by_status(
    status: TaskStatus,
    skip: int = Query(0, ge=0, description="Number of tasks to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of tasks to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tasks by status."""
    tasks = task_crud.get_by_status(db=db, status=status, skip=skip, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/search/{query}", response_model=List[TaskResponse])
def search_tasks(
    query: str,
    skip: int = Query(0, ge=0, description="Number of tasks to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of tasks to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search tasks by title and description."""
    tasks = task_crud.search_tasks(db=db, query=query, skip=skip, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/recent/list", response_model=List[TaskResponse])
def get_recent_tasks(
    limit: int = Query(10, ge=1, le=100, description="Number of recent tasks to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recently updated tasks."""
    tasks = task_crud.get_recent_tasks(db=db, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/statistics/overview")
def get_task_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get task statistics by status."""
    stats = task_crud.get_task_statistics(db=db)
    return {
        "statistics": stats,
        "message": "Task statistics retrieved successfully"
    }


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status: TaskStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update task status only."""
    db_task = task_crud.update_status(db=db, task_id=task_id, status=status)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(db_task) 