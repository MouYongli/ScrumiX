from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .base import CRUDBase
from ..models.acceptance_criteria import AcceptanceCriteria
from ..schemas.acceptance_criteria import AcceptanceCriteriaCreate, AcceptanceCriteriaUpdate


class CRUDAcceptanceCriteria(CRUDBase[AcceptanceCriteria, AcceptanceCriteriaCreate, AcceptanceCriteriaUpdate]):
    """CRUD operations for AcceptanceCriteria."""
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        backlog_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> tuple[List[AcceptanceCriteria], int]:
        """Get multiple acceptance criteria with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply backlog filter
        if backlog_id:
            query = query.filter(self.model.backlog_id == backlog_id)
        
        # Apply search filter
        if search:
            search_filter = self.model.title.ilike(f"%{search}%")
            query = query.filter(search_filter)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        criteria = query.order_by(self.model.id.asc()).offset(skip).limit(limit).all()
        
        return criteria, total
    
    def get_by_backlog_id(
        self,
        db: Session,
        backlog_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[AcceptanceCriteria]:
        """Get acceptance criteria by backlog ID."""
        return (
            db.query(self.model)
            .filter(self.model.backlog_id == backlog_id)
            .order_by(self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def count_by_backlog_id(self, db: Session, backlog_id: int) -> int:
        """Count acceptance criteria for a specific backlog."""
        return db.query(self.model).filter(self.model.backlog_id == backlog_id).count()
    
    def search_criteria(
        self,
        db: Session,
        query: str,
        backlog_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AcceptanceCriteria]:
        """Search acceptance criteria by title."""
        search_filter = self.model.title.ilike(f"%{query}%")
        
        db_query = db.query(self.model).filter(search_filter)
        
        # Optionally filter by backlog_id
        if backlog_id:
            db_query = db_query.filter(self.model.backlog_id == backlog_id)
        
        return (
            db_query
            .order_by(self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_criteria_with_backlog_info(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[AcceptanceCriteria]:
        """Get acceptance criteria with backlog information loaded."""
        return (
            db.query(self.model)
            .join(self.model.backlog)
            .order_by(self.model.backlog_id.asc(), self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def bulk_create_for_backlog(
        self,
        db: Session,
        backlog_id: int,
        criteria_titles: List[str]
    ) -> List[AcceptanceCriteria]:
        """Create multiple acceptance criteria for a backlog item."""
        criteria_objects = []
        for title in criteria_titles:
            if title and title.strip():  # Only create if title is not empty
                criteria_create = AcceptanceCriteriaCreate(
                    backlog_id=backlog_id,
                    title=title.strip()
                )
                criteria_obj = self.create(db=db, obj_in=criteria_create)
                criteria_objects.append(criteria_obj)
        
        return criteria_objects
    
    def delete_all_by_backlog_id(self, db: Session, backlog_id: int) -> int:
        """Delete all acceptance criteria for a specific backlog."""
        count = db.query(self.model).filter(self.model.backlog_id == backlog_id).count()
        db.query(self.model).filter(self.model.backlog_id == backlog_id).delete()
        db.commit()
        return count
    
    def reorder_criteria(
        self,
        db: Session,
        *,
        criteria_ids: List[int]
    ) -> List[AcceptanceCriteria]:
        """Reorder acceptance criteria by updating their IDs (for display purposes)."""
        # Note: This is a simple implementation
        # In production, you might want to add an 'order' field to the model
        criteria = []
        for criteria_id in criteria_ids:
            criteria_obj = self.get(db=db, id=criteria_id)
            if criteria_obj:
                criteria.append(criteria_obj)
        
        return criteria


acceptance_criteria = CRUDAcceptanceCriteria(AcceptanceCriteria) 