from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from .base import CRUDBase
from ..models.task import Task, TaskStatus
from ..models.user_task import UserTask
from ..schemas.task import TaskCreate, TaskUpdate


class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    """CRUD operations for Task."""
    
    def get_by_id(self, db: Session, task_id: int) -> Optional[Task]:
        """Get task by ID."""
        return self.get(db=db, id=task_id)
    
    def search(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Task]:
        """Search tasks by title and description."""
        return self.search_tasks(db, query=search_term, skip=skip, limit=limit)
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TaskStatus] = None,
        search: Optional[str] = None
    ) -> tuple[List[Task], int]:
        """Get multiple tasks with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply status filter
        if status:
            query = query.filter(self.model.status == status)
        
        # Apply search filter
        if search:
            search_filter = or_(
                self.model.title.ilike(f"%{search}%"),
                self.model.description.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        tasks = query.order_by(self.model.created_at.desc()).offset(skip).limit(limit).all()
        
        return tasks, total
    
    def get_by_status(
        self,
        db: Session,
        *,
        status: TaskStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get tasks by status."""
        return (
            db.query(self.model)
            .filter(self.model.status == status)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def update_status(self, db: Session, task_id: int, status: TaskStatus) -> Optional[Task]:
        """Update task status."""
        task = self.get(db=db, id=task_id)
        if not task:
            return None
        
        task.status = status
        db.commit()
        db.refresh(task)
        return task
    
    def get_by_sprint(
        self,
        db: Session,
        *,
        sprint_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get tasks by sprint ID."""
        return (
            db.query(self.model)
            .filter(self.model.sprint_id == sprint_id)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_tasks_by_project(
        self,
        db: Session,
        project_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get tasks by project ID (via sprint relationship)."""
        return (
            db.query(self.model)
            .join(self.model.sprint)
            .filter(self.model.sprint.has(project_id=project_id))
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_recent_tasks(
        self,
        db: Session,
        user_id: int,
        limit: int = 10
    ) -> List[Task]:
        """Get recently updated tasks for a specific user."""
        return (
            db.query(self.model)
            .join(UserTask)
            .filter(UserTask.user_id == user_id)
            .order_by(self.model.updated_at.desc())
            .limit(limit)
            .all()
        )
    
    def search_tasks(
        self,
        db: Session,
        *,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Search tasks by title and description."""
        search_filter = or_(
            self.model.title.ilike(f"%{query}%"),
            self.model.description.ilike(f"%{query}%")
        )
        
        return (
            db.query(self.model)
            .filter(search_filter)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_task_statistics(self, db: Session) -> dict:
        """Get task statistics by status."""
        stats = {}
        
        # Count tasks by status
        for status in TaskStatus:
            count = db.query(self.model).filter(self.model.status == status).count()
            stats[status.value] = count
        
        # Total tasks
        stats["total"] = db.query(self.model).count()
        
        return stats


# Create instance
task_crud = CRUDTask(Task) 