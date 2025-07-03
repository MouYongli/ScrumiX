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
from ..crud.task import task

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
    tasks, total = task.get_multi_with_pagination(
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
    db_task = task.create(db=db, obj_in=task_in)
    return TaskResponse.model_validate(db_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific task by ID."""
    db_task = task.get(db=db, id=task_id)
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
    db_task = task.get(db=db, id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db_task = task.update(db=db, db_obj=db_task, obj_in=task_in)
    return TaskResponse.model_validate(db_task)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific task."""
    db_task = task.get(db=db, id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.remove(db=db, id=task_id)
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
    tasks = task.get_by_status(db=db, status=status, skip=skip, limit=limit)
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
    tasks = task.search_tasks(db=db, query=query, skip=skip, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/recent/list", response_model=List[TaskResponse])
def get_recent_tasks(
    limit: int = Query(10, ge=1, le=100, description="Number of recent tasks to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recently updated tasks."""
    tasks = task.get_recent_tasks(db=db, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/statistics/overview")
def get_task_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get task statistics by status."""
    stats = task.get_task_statistics(db=db)
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
    db_task = task.update_status(db=db, task_id=task_id, status=status)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(db_task) 