from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from .base import CRUDBase
from ..models.tag import Tag
from ..schemas.tag import TagCreate, TagUpdate


class CRUDTag(CRUDBase[Tag, TagCreate, TagUpdate]):
    """CRUD operations for Tag."""
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> tuple[List[Tag], int]:
        """Get multiple tags with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply search filter
        if search:
            search_filter = self.model.title.ilike(f"%{search}%")
            query = query.filter(search_filter)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        tags = query.order_by(self.model.title.asc()).offset(skip).limit(limit).all()
        
        return tags, total
    
    def get_by_title(self, db: Session, title: str) -> Optional[Tag]:
        """Get tag by title (case-insensitive)."""
        return db.query(self.model).filter(
            func.lower(self.model.title) == func.lower(title)
        ).first()
    
    def get_or_create_by_title(self, db: Session, title: str, tag_data: Optional[TagCreate] = None) -> Tag:
        """Get existing tag by title or create a new one."""
        tag = self.get_by_title(db=db, title=title)
        if tag:
            return tag
        
        if tag_data:
            tag_create = tag_data
        else:
            tag_create = TagCreate(title=title)
        return self.create(db=db, obj_in=tag_create)
    
    def search_tags(
        self,
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Tag]:
        """Search tags by title."""
        search_filter = self.model.title.ilike(f"%{query}%")
        
        return (
            db.query(self.model)
            .filter(search_filter)
            .order_by(self.model.title.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_tags_starting_with(
        self,
        db: Session,
        prefix: str,
        limit: int = 10
    ) -> List[Tag]:
        """Get tags starting with specific prefix (for autocomplete)."""
        return (
            db.query(self.model)
            .filter(self.model.title.ilike(f"{prefix}%"))
            .order_by(self.model.title.asc())
            .limit(limit)
            .all()
        )
    
    def get_popular_tags(
        self,
        db: Session,
        *,
        limit: int = 10
    ) -> List[Tag]:
        """Get most popular tags (ordered alphabetically for now)."""
        # For now, just return alphabetically ordered tags
        # In future, this could be based on usage count
        return (
            db.query(self.model)
            .order_by(self.model.title.asc())
            .limit(limit)
            .all()
        )
    
    def check_title_exists(self, db: Session, title: str, exclude_id: Optional[int] = None) -> bool:
        """Check if tag title already exists (case-insensitive)."""
        query = db.query(self.model).filter(
            func.lower(self.model.title) == func.lower(title)
        )
        
        if exclude_id:
            query = query.filter(self.model.id != exclude_id)
        
        return query.first() is not None

    def create(self, db: Session, *, obj_in: TagCreate) -> Tag:
        """Create a new tag with title validation."""
        # Check if title already exists
        existing = self.get_by_title(db=db, title=obj_in.title)
        if existing:
            raise ValueError(f"Tag with title '{obj_in.title}' already exists")
        
        return super().create(db=db, obj_in=obj_in)


# Create instance
tag = CRUDTag(Tag) 