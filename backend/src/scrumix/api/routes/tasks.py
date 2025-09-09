from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
import math
import asyncio

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
from ..core.embedding_service import embedding_service

router = APIRouter()


async def update_task_embeddings_background(task_id: int, db: Session):
    """Background task to update embeddings for a task"""
    try:
        await embedding_service.update_task_embedding(db, task_id)
    except Exception as e:
        print(f"Failed to update embeddings for task {task_id}: {e}")


def schedule_embedding_update(background_tasks: BackgroundTasks, task_id: int, db: Session):
    """Schedule embedding update as background task"""
    background_tasks.add_task(update_task_embeddings_background, task_id, db)


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task."""
    db_task = task_crud.create(db=db, obj_in=task_in)
    
    # Schedule embedding generation in background
    schedule_embedding_update(background_tasks, db_task.id, db)
    
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific task."""
    db_task = task_crud.get(db=db, id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Store old values for comparison
    old_status = db_task.status.value if db_task.status else None
    old_title = db_task.title
    old_description = db_task.description
    
    # Update the task
    db_task = task_crud.update(db=db, db_obj=db_task, obj_in=task_in)
    
    # Check if title or description changed and schedule embedding update
    title_changed = task_in.title and task_in.title != old_title
    description_changed = task_in.description is not None and task_in.description != old_description
    
    if title_changed or description_changed:
        schedule_embedding_update(background_tasks, db_task.id, db)
    
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


# Semantic search endpoints
@router.get("/semantic-search")
async def semantic_search_tasks(
    query: str = Query(..., description="Search query text"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    sprint_id: Optional[int] = Query(None, description="Filter by sprint ID"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    similarity_threshold: float = Query(0.7, ge=0.0, le=1.0, description="Minimum similarity score"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform semantic search on tasks using combined embedding.
    Searches across title, description, status, and priority.
    """
    try:
        results = await task_crud.semantic_search(
            db=db,
            query=query,
            project_id=project_id,
            sprint_id=sprint_id,
            limit=limit,
            similarity_threshold=similarity_threshold
        )
        
        search_results = []
        for task, similarity in results:
            task_response = TaskResponse.model_validate(task)
            search_results.append({
                "task": task_response,
                "similarity_score": similarity
            })
        
        return {
            "results": search_results,
            "total": len(search_results),
            "query": query,
            "similarity_threshold": similarity_threshold
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {str(e)}"
        )


@router.get("/{task_id}/similar")
async def find_similar_tasks(
    task_id: int,
    limit: int = Query(5, ge=1, le=20, description="Maximum number of similar tasks"),
    similarity_threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity score"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find tasks similar to the given task based on embeddings.
    """
    try:
        results = await task_crud.find_similar_tasks(
            db=db,
            task_id=task_id,
            limit=limit,
            similarity_threshold=similarity_threshold
        )
        
        similar_tasks = []
        for task, similarity in results:
            task_response = TaskResponse.model_validate(task)
            similar_tasks.append({
                "task": task_response,
                "similarity_score": similarity
            })
        
        return {
            "similar_tasks": similar_tasks,
            "total": len(similar_tasks),
            "reference_task_id": task_id,
            "similarity_threshold": similarity_threshold
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Similar task search failed: {str(e)}"
        )


@router.post("/{task_id}/update-embeddings")
async def update_task_embeddings(
    task_id: int,
    force: bool = Query(False, description="Force update even if up to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger embedding update for a specific task.
    Useful for testing or when automatic embedding generation fails.
    """
    try:
        success = await task_crud.update_embedding(db=db, task_id=task_id, force=force)
        
        if success:
            return {
                "message": f"Embeddings updated successfully for task {task_id}",
                "task_id": task_id
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update embeddings for task {task_id}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding update failed: {str(e)}"
        )


@router.post("/update-all-embeddings")
async def update_all_task_embeddings(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    sprint_id: Optional[int] = Query(None, description="Filter by sprint ID"),
    force: bool = Query(False, description="Force update all embeddings"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update embeddings for all tasks (optionally filtered by project or sprint).
    Admin-only endpoint for batch embedding updates.
    """
    # Check if user has admin privileges (you may want to add proper permission checking)
    if not hasattr(current_user, 'is_superuser') or not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can update all embeddings"
        )
    
    try:
        stats = await task_crud.update_all_embeddings(
            db=db,
            project_id=project_id,
            sprint_id=sprint_id,
            force=force
        )
        
        total_processed = stats["updated"] + stats["failed"] + stats["skipped"]
        message = f"Processed {total_processed} tasks: {stats['updated']} updated, {stats['skipped']} skipped, {stats['failed']} failed"
        
        return {
            "updated": stats["updated"],
            "failed": stats["failed"],
            "skipped": stats["skipped"],
            "total_processed": total_processed,
            "message": message
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch embedding update failed: {str(e)}"
        ) 