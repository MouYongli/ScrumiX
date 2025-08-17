"""
Sprint Backlog CRUD operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from scrumix.api.models.backlog import Backlog
from scrumix.api.models.task import Task
from scrumix.api.models.sprint import Sprint


class SprintBacklogCRUD:
    """CRUD operations for sprint backlog management"""
    
    def get_sprint_backlog_items(
        self, 
        db: Session, 
        sprint_id: int,
        skip: int = 0, 
        limit: int = 1000
    ) -> List[Backlog]:
        """Get all backlog items assigned to a specific sprint"""
        return (
            db.query(Backlog)
            .filter(Backlog.sprint_id == sprint_id)
            .order_by(Backlog.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_available_backlog_items(
        self, 
        db: Session, 
        project_id: int,
        sprint_id: Optional[int] = None,
        item_type: Optional[str] = None,
        skip: int = 0, 
        limit: int = 1000
    ) -> List[Backlog]:
        """Get backlog items that are not assigned to any sprint (or to a specific sprint)"""
        query = db.query(Backlog).filter(Backlog.project_id == project_id)
        
        if sprint_id:
            # Get items assigned to this specific sprint
            query = query.filter(Backlog.sprint_id == sprint_id)
        else:
            # Get items not assigned to any sprint
            query = query.filter(Backlog.sprint_id.is_(None))
        
        # Add item_type filtering if provided
        if item_type:
            query = query.filter(Backlog.item_type == item_type)
            print(f"[DEBUG] Filtering by item_type: {item_type}")
        
        result = query.order_by(Backlog.created_at.desc()).offset(skip).limit(limit).all()
        print(f"[DEBUG] CRUD method returning {len(result)} items for project {project_id}")
        
        # Additional debugging: check for duplicate IDs
        ids = [item.id for item in result]
        unique_ids = set(ids)
        if len(ids) != len(unique_ids):
            print(f"[WARNING] Duplicate IDs detected in result: {len(ids)} total, {len(unique_ids)} unique")
            duplicate_ids = [id for id in ids if ids.count(id) > 1]
            print(f"[WARNING] Duplicate IDs: {duplicate_ids}")
        
        return result
    
    def add_backlog_item_to_sprint(
        self, 
        db: Session, 
        sprint_id: int, 
        backlog_id: int
    ) -> Optional[Backlog]:
        """Add a backlog item to a sprint"""
        backlog_item = db.query(Backlog).filter(Backlog.id == backlog_id).first()
        if not backlog_item:
            return None
        
        # Check if item is already in a sprint
        if backlog_item.sprint_id is not None:
            raise ValueError("Backlog item is already assigned to a sprint")
        
        # Assign to sprint
        backlog_item.sprint_id = sprint_id
        db.commit()
        db.refresh(backlog_item)
        return backlog_item
    
    def remove_backlog_item_from_sprint(
        self, 
        db: Session, 
        sprint_id: int, 
        backlog_id: int
    ) -> bool:
        """Remove a backlog item from a sprint and delete associated tasks"""
        backlog_item = db.query(Backlog).filter(
            and_(Backlog.id == backlog_id, Backlog.sprint_id == sprint_id)
        ).first()
        
        if not backlog_item:
            return False
        
        # Delete all tasks associated with this backlog item
        tasks_to_delete = db.query(Task).filter(
            and_(Task.backlog_id == backlog_id, Task.sprint_id == sprint_id)
        ).all()
        
        for task in tasks_to_delete:
            db.delete(task)
        
        # Remove from sprint (set sprint_id to None)
        backlog_item.sprint_id = None
        
        db.commit()
        return True
    
    def get_backlog_item_tasks(
        self, 
        db: Session, 
        backlog_id: int,
        sprint_id: Optional[int] = None
    ) -> List[Task]:
        """Get all tasks for a specific backlog item"""
        query = db.query(Task).filter(Task.backlog_id == backlog_id)
        
        if sprint_id:
            query = query.filter(Task.sprint_id == sprint_id)
        
        return query.order_by(Task.created_at.desc()).all()
    
    def create_task_for_backlog_item(
        self, 
        db: Session, 
        task_data: dict,
        backlog_id: int,
        sprint_id: int
    ) -> Task:
        """Create a new task for a backlog item in a sprint"""
        task = Task(
            **task_data,
            backlog_id=backlog_id,
            sprint_id=sprint_id
        )
        
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    
    def update_task(
        self, 
        db: Session, 
        task_id: int,
        task_data: dict
    ) -> Optional[Task]:
        """Update an existing task"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
        
        for field, value in task_data.items():
            if hasattr(task, field):
                setattr(task, field, value)
        
        db.commit()
        db.refresh(task)
        return task
    
    def delete_task(
        self, 
        db: Session, 
        task_id: int
    ) -> bool:
        """Delete a task"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        
        db.delete(task)
        db.commit()
        return True
    
    def get_sprint_statistics(
        self, 
        db: Session, 
        sprint_id: int
    ) -> dict:
        """Get sprint backlog statistics"""
        # Count backlog items
        backlog_count = db.query(Backlog).filter(Backlog.sprint_id == sprint_id).count()
        
        # Count tasks
        task_count = db.query(Task).filter(Task.sprint_id == sprint_id).count()
        
        # Calculate total story points
        total_story_points = db.query(Backlog).filter(
            Backlog.sprint_id == sprint_id
        ).with_entities(
            db.func.sum(Backlog.story_point)
        ).scalar() or 0
        
        # Count by status
        status_counts = {}
        backlog_items = db.query(Backlog).filter(Backlog.sprint_id == sprint_id).all()
        for item in backlog_items:
            status = item.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "backlog_items_count": backlog_count,
            "tasks_count": task_count,
            "total_story_points": total_story_points,
            "status_distribution": status_counts
        }


# Create CRUD instance
sprint_backlog_crud = SprintBacklogCRUD()
