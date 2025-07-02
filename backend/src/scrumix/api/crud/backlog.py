"""
Backlog-related CRUD operations
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from scrumix.api.models.backlog import Backlog, BacklogStatus, BacklogPriority
from scrumix.api.schemas.backlog import BacklogCreate, BacklogUpdate
from scrumix.api.crud.base import CRUDBase

class BacklogCRUD(CRUDBase[Backlog, BacklogCreate, BacklogUpdate]):
    def create_backlog(self, db: Session, backlog_create: BacklogCreate) -> Backlog:
        """Create a new backlog item"""
        # Validate parent exists if parent_id is provided
        if backlog_create.parentId:
            parent = self.get_by_id(db, backlog_create.parentId)
            if not parent:
                raise ValueError("Parent backlog item not found")
        
        # Create backlog object
        db_backlog = Backlog(
            title=backlog_create.title,
            description=backlog_create.description,
            status=backlog_create.status,
            story_point=backlog_create.storyPoint,
            priority=backlog_create.priority,
            label=backlog_create.label,
            parent_id=backlog_create.parentId
        )
        
        db.add(db_backlog)
        db.commit()
        db.refresh(db_backlog)
        return db_backlog
    
    def get_by_id(self, db: Session, backlog_id: int) -> Optional[Backlog]:
        """Get backlog item by ID"""
        return db.query(Backlog).filter(Backlog.backlog_id == backlog_id).first()
    
    def get_by_title(self, db: Session, title: str) -> Optional[Backlog]:
        """Get backlog item by title"""
        return db.query(Backlog).filter(Backlog.title == title).first()
    
    def get_backlogs(self, db: Session, skip: int = 0, limit: int = 100, 
                    status: Optional[BacklogStatus] = None,
                    priority: Optional[BacklogPriority] = None) -> List[Backlog]:
        """Get list of backlog items"""
        query = db.query(Backlog)
        
        if status:
            query = query.filter(Backlog.status == status)
        
        if priority:
            query = query.filter(Backlog.priority == priority)
        
        return query.order_by(Backlog.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_root_backlogs(self, db: Session, skip: int = 0, limit: int = 100) -> List[Backlog]:
        """Get backlog items without parents (root items)"""
        return db.query(Backlog).filter(Backlog.parent_id.is_(None))\
                 .order_by(Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_children(self, db: Session, parent_id: int) -> List[Backlog]:
        """Get all children of a backlog item"""
        return db.query(Backlog).filter(Backlog.parent_id == parent_id)\
                 .order_by(Backlog.created_at.asc()).all()
    
    def get_backlog_tree(self, db: Session, root_id: int) -> Optional[Backlog]:
        """Get backlog item with all its descendants"""
        backlog = self.get_by_id(db, root_id)
        if backlog:
            # Recursively load children
            self._load_children_recursive(db, backlog)
        return backlog
    
    def _load_children_recursive(self, db: Session, backlog: Backlog) -> None:
        """Recursively load children for a backlog item"""
        children = self.get_children(db, backlog.backlog_id)
        for child in children:
            self._load_children_recursive(db, child)
        # This modifies the backlog object in place
    
    def search_backlogs(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Backlog]:
        """Search backlog items"""
        query = db.query(Backlog).filter(
            or_(
                Backlog.title.ilike(f"%{search_term}%"),
                Backlog.description.ilike(f"%{search_term}%"),
                Backlog.label.ilike(f"%{search_term}%")
            )
        )
        
        return query.order_by(Backlog.created_at.desc()).offset(skip).limit(limit).all()
    
    def update_backlog(self, db: Session, backlog_id: int, backlog_update: BacklogUpdate) -> Optional[Backlog]:
        """Update backlog item information"""
        backlog = self.get_by_id(db, backlog_id)
        if not backlog:
            return None
        
        update_data = backlog_update.model_dump(exclude_unset=True, by_alias=True)
        
        # Validate parent_id if being updated
        if "parent_id" in update_data and update_data["parent_id"] is not None:
            # Prevent circular references
            if update_data["parent_id"] == backlog_id:
                raise ValueError("Backlog item cannot be its own parent")
            
            # Check if parent exists
            parent = self.get_by_id(db, update_data["parent_id"])
            if not parent:
                raise ValueError("Parent backlog item not found")
        
        for field, value in update_data.items():
            setattr(backlog, field, value)
        
        db.commit()
        db.refresh(backlog)
        return backlog
    
    def delete_backlog(self, db: Session, backlog_id: int, delete_children: bool = False) -> bool:
        """Delete backlog item"""
        backlog = self.get_by_id(db, backlog_id)
        if not backlog:
            return False
        
        # Handle children
        children = self.get_children(db, backlog_id)
        if children:
            if delete_children:
                # Recursively delete all children
                for child in children:
                    self.delete_backlog(db, child.backlog_id, delete_children=True)
            else:
                # Move children to parent's level (orphan them)
                for child in children:
                    child.parent_id = backlog.parent_id
        
        db.delete(backlog)
        db.commit()
        return True
    
    def get_backlogs_by_status(self, db: Session, status: BacklogStatus, 
                              skip: int = 0, limit: int = 100) -> List[Backlog]:
        """Get backlog items by status"""
        return db.query(Backlog).filter(Backlog.status == status)\
                 .order_by(Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_backlogs_by_priority(self, db: Session, priority: BacklogPriority,
                                skip: int = 0, limit: int = 100) -> List[Backlog]:
        """Get backlog items by priority"""
        return db.query(Backlog).filter(Backlog.priority == priority)\
                 .order_by(Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def count_backlogs(self, db: Session, status: Optional[BacklogStatus] = None) -> int:
        """Count backlog items"""
        query = db.query(Backlog)
        if status:
            query = query.filter(Backlog.status == status)
        return query.count()
    
    def get_total_story_points(self, db: Session, status: Optional[BacklogStatus] = None) -> int:
        """Get total story points across backlog items"""
        query = db.query(Backlog)
        if status:
            query = query.filter(Backlog.status == status)
        
        total = 0
        items = query.all()
        for item in items:
            if item.story_point:
                total += item.story_point
        return total

# Create CRUD instance
backlog_crud = BacklogCRUD(Backlog) 