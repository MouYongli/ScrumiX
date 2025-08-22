"""
UserTask CRUD operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .base import CRUDBase
from ..models.user_task import UserTask, UserTaskRole
from ..models.user import User
from ..models.task import Task


class CRUDUserTask(CRUDBase[UserTask, dict, dict]):
    """CRUD operations for UserTask (task assignees)."""
    
    def get_task_assignees(self, db: Session, task_id: int) -> List[UserTask]:
        """Get all assignees for a task."""
        return (
            db.query(self.model)
            .filter(self.model.task_id == task_id)
            .filter(self.model.role == UserTaskRole.ASSIGNEE)
            .all()
        )
    
    def get_user_tasks(self, db: Session, user_id: int) -> List[UserTask]:
        """Get all tasks assigned to a user."""
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id)
            .filter(self.model.role == UserTaskRole.ASSIGNEE)
            .all()
        )
    
    def assign_user_to_task(
        self, 
        db: Session, 
        user_id: int, 
        task_id: int,
        role: UserTaskRole = UserTaskRole.ASSIGNEE
    ) -> Optional[UserTask]:
        """Assign a user to a task with a specific role."""
        # Check if assignment already exists
        existing = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.task_id == task_id,
                self.model.role == role
            )
        ).first()
        
        if existing:
            return existing
        
        # Verify user and task exist
        user = db.query(User).filter(User.id == user_id).first()
        task = db.query(Task).filter(Task.id == task_id).first()
        
        if not user or not task:
            return None
        
        # Create new assignment
        user_task = UserTask(
            user_id=user_id,
            task_id=task_id,
            role=role
        )
        
        db.add(user_task)
        db.commit()
        db.refresh(user_task)
        return user_task
    
    def unassign_user_from_task(
        self, 
        db: Session, 
        user_id: int, 
        task_id: int,
        role: UserTaskRole = UserTaskRole.ASSIGNEE
    ) -> bool:
        """Remove a user assignment from a task."""
        user_task = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.task_id == task_id,
                self.model.role == role
            )
        ).first()
        
        if not user_task:
            return False
        
        db.delete(user_task)
        db.commit()
        return True
    
    def set_task_assignees(
        self, 
        db: Session, 
        task_id: int, 
        user_ids: List[int]
    ) -> List[UserTask]:
        """Set the complete list of assignees for a task (replace existing)."""
        # Remove all existing assignees
        db.query(self.model).filter(
            and_(
                self.model.task_id == task_id,
                self.model.role == UserTaskRole.ASSIGNEE
            )
        ).delete()
        
        # Add new assignees
        user_tasks = []
        for user_id in user_ids:
            # Verify user exists
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user_task = UserTask(
                    user_id=user_id,
                    task_id=task_id,
                    role=UserTaskRole.ASSIGNEE
                )
                db.add(user_task)
                user_tasks.append(user_task)
        
        db.commit()
        
        # Refresh all user_tasks to get proper relationships
        for user_task in user_tasks:
            db.refresh(user_task)
        
        return user_tasks
    
    def get_task_assignee_details(self, db: Session, task_id: int) -> List[dict]:
        """Get detailed assignee information for a task."""
        assignees = (
            db.query(self.model)
            .join(User)
            .filter(self.model.task_id == task_id)
            .filter(self.model.role == UserTaskRole.ASSIGNEE)
            .all()
        )
        
        return [
            {
                "id": assignee.user.id,
                "username": assignee.user.username,
                "full_name": assignee.user.full_name,
                "email": assignee.user.email,
                "role": assignee.role.value,
                "assigned_at": assignee.created_at
            }
            for assignee in assignees
        ]
    
    def remove_all_task_assignees(self, db: Session, task_id: int) -> bool:
        """Remove all assignees from a task."""
        deleted_count = db.query(self.model).filter(
            and_(
                self.model.task_id == task_id,
                self.model.role == UserTaskRole.ASSIGNEE
            )
        ).delete()
        
        db.commit()
        return deleted_count > 0


# Create instance
user_task_crud = CRUDUserTask(UserTask)
