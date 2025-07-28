"""
Optimized CRUD operations for Backlog
"""
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
from datetime import datetime, timedelta

from .base import CRUDBase
from ..models.backlog import Backlog, BacklogStatus, BacklogPriority, BacklogType
from ..schemas.backlog import BacklogCreate, BacklogUpdate

class BacklogCRUD(CRUDBase[Backlog, BacklogCreate, BacklogUpdate]):
    """Optimized CRUD operations for Backlog."""
    
    def get_by_id(self, db: Session, backlog_id: int) -> Optional[Backlog]:
        """Get backlog item by ID"""
        return self.get(db, backlog_id)
    
    def get_backlog(self, db: Session, backlog_id: int) -> Optional[Backlog]:
        """Get backlog item by ID - alias for tests compatibility"""
        return self.get(db, backlog_id)
    
    def create_backlog(self, db: Session, backlog_create: BacklogCreate) -> Backlog:
        """Create a new backlog item"""
        backlog = self.create(db, obj_in=backlog_create)
        self._initialize_tree_fields(db, backlog)
        return backlog
    
    def _initialize_tree_fields(self, db: Session, backlog: Backlog) -> None:
        """Initialize tree-related fields for a new backlog item"""
        if backlog.parent_id:
            parent = self.get_by_id(db, backlog.parent_id)
            if parent:
                backlog.level = parent.level + 1
                backlog.path = f"{parent.path}/{backlog.backlog_id}" if parent.path else str(backlog.backlog_id)
                backlog.root_id = parent.root_id if parent.root_id else parent.backlog_id
            else:
                backlog.level = 0
                backlog.path = str(backlog.backlog_id)
                backlog.root_id = backlog.backlog_id
        else:
            backlog.level = 0
            backlog.path = str(backlog.backlog_id)
            backlog.root_id = backlog.backlog_id
        
        db.commit()
    
    def get_backlogs(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[BacklogStatus] = None,
        priority: Optional[BacklogPriority] = None,
        item_type: Optional[BacklogType] = None,
        project_id: Optional[int] = None,
        sprint_id: Optional[int] = None,
        assignee_id: Optional[int] = None,
        root_only: bool = False,
        include_children: bool = False
    ) -> List[Backlog]:
        """Get list of backlog items with optimized filtering"""
        query = db.query(Backlog)
        
        # Apply filters using indexed columns for better performance
        if status:
            query = query.filter(Backlog.status == status)
        
        if priority:
            query = query.filter(Backlog.priority == priority)
            
        if item_type:
            query = query.filter(Backlog.item_type == item_type)
            
        if project_id:
            query = query.filter(Backlog.project_id == project_id)
            
        if sprint_id:
            query = query.filter(Backlog.sprint_id == sprint_id)
            
        if assignee_id:
            query = query.filter(Backlog.assigned_to_id == assignee_id)
        
        # Optimized root-only query using indexed level column
        if root_only:
            query = query.filter(Backlog.level == 0)
        
        # Include children if requested
        if include_children:
            query = query.options(joinedload(Backlog.children))
        
        return query.order_by(Backlog.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_root_backlogs(self, db: Session, skip: int = 0, limit: int = 100) -> List[Backlog]:
        """Get backlog items without parents (root items) - OPTIMIZED"""
        return db.query(Backlog).filter(Backlog.level == 0)\
                 .order_by(Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_children(self, db: Session, parent_id: int, include_descendants: bool = False) -> List[Backlog]:
        """Get children of a backlog item - OPTIMIZED"""
        if include_descendants:
            # Use materialized path for efficient descendant queries
            parent = self.get_by_id(db, parent_id)
            if parent and parent.path:
                path_pattern = f"{parent.path}%"
                return db.query(Backlog).filter(Backlog.path.like(path_pattern))\
                         .order_by(Backlog.level.asc(), Backlog.created_at.asc()).all()
            else:
                return db.query(Backlog).filter(Backlog.root_id == parent_id)\
                         .order_by(Backlog.level.asc(), Backlog.created_at.asc()).all()
        else:
            return db.query(Backlog).filter(Backlog.parent_id == parent_id)\
                     .order_by(Backlog.created_at.asc()).all()
    
    def get_backlog_tree(self, db: Session, root_id: int) -> Optional[Backlog]:
        """Get backlog item with all its descendants - OPTIMIZED"""
        # Use materialized path for efficient tree loading
        root = self.get_by_id(db, root_id)
        if root:
            if root.path:
                # Load all descendants using path
                descendants = db.query(Backlog).filter(
                    Backlog.path.like(f"{root.path}%")
                ).order_by(Backlog.level.asc()).all()
                
                # Build tree structure
                self._build_tree_from_list(root, descendants)
            else:
                # Fallback to recursive loading for items without path
                self._load_children_recursive(db, root)
        return root
    
    def _build_tree_from_list(self, root: Backlog, descendants: List[Backlog]) -> None:
        """Build tree structure from flat list of descendants"""
        # Create lookup for quick access
        lookup = {item.backlog_id: item for item in descendants}
        lookup[root.backlog_id] = root
        
        # Build parent-child relationships
        for item in descendants:
            if item.parent_id and item.parent_id in lookup:
                parent = lookup[item.parent_id]
                if not hasattr(parent, '_children'):
                    parent._children = []
                parent._children.append(item)
    
    def _load_children_recursive(self, db: Session, backlog: Backlog) -> None:
        """Recursively load children for a backlog item - FALLBACK METHOD"""
        children = self.get_children(db, backlog.backlog_id)
        for child in children:
            self._load_children_recursive(db, child)
    
    def search_backlogs(
        self, 
        db: Session, 
        search_term: str, 
        skip: int = 0, 
        limit: int = 100,
        use_full_text_search: bool = True
    ) -> List[Backlog]:
        """Search backlog items by title and description - OPTIMIZED for SQLite"""
        if not search_term:
            return []
        
        # Use SQLite-compatible search with LIKE operator
        search_pattern = f"%{search_term}%"
        query = db.query(Backlog).filter(
            or_(
                Backlog.title.ilike(search_pattern),
                Backlog.description.ilike(search_pattern)
            )
        )
        
        return query.order_by(Backlog.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_backlogs_by_status(
        self, 
        db: Session, 
        status: BacklogStatus, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Backlog]:
        """Get backlog items by status - OPTIMIZED"""
        return db.query(Backlog).filter(Backlog.status == status)\
                 .order_by(Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_backlogs_by_priority(
        self, 
        db: Session, 
        priority: BacklogPriority,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Backlog]:
        """Get backlog items by priority - OPTIMIZED"""
        return db.query(Backlog).filter(Backlog.priority == priority)\
                 .order_by(Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_overdue_backlogs(self, db: Session, skip: int = 0, limit: int = 100) -> List[Backlog]:
        """Get overdue backlog items"""
        # Since due_date is removed, this method now returns empty list
        # or could be removed entirely
        return []
    
    def get_backlogs_by_project(
        self, 
        db: Session, 
        project_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Backlog]:
        """Get backlog items by project - OPTIMIZED"""
        return db.query(Backlog).filter(Backlog.project_id == project_id)\
                 .order_by(Backlog.priority.desc(), Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_backlogs_by_sprint(
        self, 
        db: Session, 
        sprint_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Backlog]:
        """Get backlog items by sprint - OPTIMIZED"""
        return db.query(Backlog).filter(Backlog.sprint_id == sprint_id)\
                 .order_by(Backlog.priority.desc(), Backlog.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_backlogs_by_assignee(
        self, 
        db: Session, 
        assignee_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Backlog]:
        """Get backlog items assigned to a user - OPTIMIZED"""
        return db.query(Backlog).filter(Backlog.assigned_to_id == assignee_id)\
                 .order_by(Backlog.priority.desc(), Backlog.created_at.asc().nulls_last())\
                 .offset(skip).limit(limit).all()
    
    def count_backlogs(
        self, 
        db: Session, 
        status: Optional[BacklogStatus] = None,
        project_id: Optional[int] = None,
        sprint_id: Optional[int] = None
    ) -> int:
        """Count backlog items - OPTIMIZED"""
        query = db.query(Backlog)
        if status:
            query = query.filter(Backlog.status == status)
        if project_id:
            query = query.filter(Backlog.project_id == project_id)
        if sprint_id:
            query = query.filter(Backlog.sprint_id == sprint_id)
        return query.count()
    
    def get_backlog_statistics(self, db: Session, project_id: Optional[int] = None) -> Dict[str, Any]:
        """Get backlog statistics - OPTIMIZED"""
        query = db.query(Backlog)
        if project_id:
            query = query.filter(Backlog.project_id == project_id)
        
        # Get counts by status
        status_counts = db.query(
            Backlog.status,
            func.count(Backlog.backlog_id)
        ).filter(query.whereclause).group_by(Backlog.status).all()
        
        # Get counts by priority
        priority_counts = db.query(
            Backlog.priority,
            func.count(Backlog.backlog_id)
        ).filter(query.whereclause).group_by(Backlog.priority).all()
        
        # Get total story points
        total_points = db.query(func.sum(Backlog.story_point)).filter(query.whereclause).scalar() or 0
        
        return {
            "status_counts": dict(status_counts),
            "priority_counts": dict(priority_counts),
            "total_points": total_points,
            "total_count": query.count()
        }
    
    def update_backlog(self, db: Session, backlog_id: int, backlog_update: BacklogUpdate) -> Optional[Backlog]:
        """Update backlog item information - OPTIMIZED with path updates"""
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
            
            # Update hierarchical fields
            update_data["level"] = parent.level + 1
            update_data["root_id"] = parent.root_id or parent.backlog_id
            update_data["path"] = f"{parent.get_full_path()}"
        
        for field, value in update_data.items():
            setattr(backlog, field, value)
        
        db.commit()
        db.refresh(backlog)
        return backlog
    
    def delete_backlog(self, db: Session, backlog_id: int, delete_children: bool = False) -> bool:
        """Delete backlog item - OPTIMIZED"""
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
                    child.level = backlog.level
                    child.root_id = backlog.root_id
                    child.path = backlog.path
        
        db.delete(backlog)
        db.commit()
        return True
    
    def bulk_update_status(
        self, 
        db: Session, 
        backlog_ids: List[int], 
        status: BacklogStatus
    ) -> int:
        """Bulk update status of multiple backlog items - OPTIMIZED"""
        result = db.query(Backlog).filter(Backlog.id.in_(backlog_ids)).update(
            {
                Backlog.status: status,
                Backlog.updated_at: datetime.now()
            },
            synchronize_session=False
        )
        db.commit()
        return result
    
    def get_backlog_hierarchy(self, db: Session, project_id: int) -> List[Dict[str, Any]]:
        """Get complete backlog hierarchy for a project - OPTIMIZED"""
        # Get all root items for the project
        roots = db.query(Backlog).filter(
            and_(
                Backlog.project_id == project_id,
                Backlog.level == 0
            )
        ).order_by(Backlog.priority.desc(), Backlog.created_at.desc()).all()
        
        hierarchy = []
        for root in roots:
            # Load all descendants for this root
            descendants = db.query(Backlog).filter(
                Backlog.root_id == root.backlog_id
            ).order_by(Backlog.level.asc(), Backlog.created_at.asc()).all()
            
            # Build tree structure
            root_dict = self._build_hierarchy_dict(root, descendants)
            hierarchy.append(root_dict)
        
        return hierarchy
    
    def _build_hierarchy_dict(self, root: Backlog, descendants: List[Backlog]) -> Dict[str, Any]:
        """Build hierarchy dictionary for a root item"""
        lookup = {item.backlog_id: item for item in descendants}
        lookup[root.backlog_id] = root
        
        def build_node(item: Backlog) -> Dict[str, Any]:
            node = {
                "id": item.backlog_id,
                "title": item.title,
                "status": item.status.value,
                "priority": item.priority.value,
                "type": item.item_type.value,
                "story_points": item.story_point,
                "level": item.level,
                "children": []
            }
            
            # Find children
            for descendant in descendants:
                if descendant.parent_id == item.backlog_id:
                    node["children"].append(build_node(descendant))
            
            return node
        
        return build_node(root)

# Create CRUD instance
backlog_crud = BacklogCRUD(Backlog)

# Export functions for test compatibility
def get_backlogs(db: Session, skip: int = 0, limit: int = 100, **kwargs) -> List[Backlog]:
    """Get list of backlog items"""
    return backlog_crud.get_backlogs(db, skip=skip, limit=limit, **kwargs)

def get_backlog(db: Session, backlog_id: int) -> Optional[Backlog]:
    """Get backlog item by ID"""
    return backlog_crud.get_backlog(db, backlog_id)

def create_backlog(db: Session, backlog_create: BacklogCreate) -> Backlog:
    """Create a new backlog item"""
    return backlog_crud.create_backlog(db, backlog_create)

def update_backlog(db: Session, backlog_id: int, backlog_update: BacklogUpdate) -> Optional[Backlog]:
    """Update backlog item"""
    return backlog_crud.update_backlog(db, backlog_id, backlog_update)

def delete_backlog(db: Session, backlog_id: int) -> bool:
    """Delete backlog item"""
    return backlog_crud.delete_backlog(db, backlog_id) 