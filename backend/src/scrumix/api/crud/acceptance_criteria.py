from typing import Optional, List, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .base import CRUDBase
from ..models.acceptance_criteria import AcceptanceCriteria
from ..schemas.acceptance_criteria import AcceptanceCriteriaCreate, AcceptanceCriteriaUpdate
from ..core.embedding_service import embedding_service


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
    
    async def semantic_search(
        self,
        db: Session,
        query: str,
        backlog_id: Optional[int] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[AcceptanceCriteria, float]]:
        """
        Perform semantic search on acceptance criteria using embeddings.
        
        Args:
            db: Database session
            query: Search query text
            backlog_id: Optional backlog ID filter
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score (0.0 to 1.0)
            
        Returns:
            List of tuples containing (AcceptanceCriteria, similarity_score)
        """
        # Generate embedding for the query
        query_embedding = await embedding_service.generate_embedding(query)
        if not query_embedding:
            return []
        
        # Build the base query
        base_query = db.query(self.model)
        
        # Apply backlog filter
        if backlog_id:
            base_query = base_query.filter(self.model.backlog_id == backlog_id)
        
        # Only include criteria that have embeddings
        base_query = base_query.filter(self.model.embedding.isnot(None))
        
        # Calculate cosine similarity and filter by threshold
        similarity_expr = 1 - self.model.embedding.cosine_distance(query_embedding)
        
        query_with_similarity = base_query.add_columns(similarity_expr.label('similarity')).filter(
            similarity_expr >= similarity_threshold
        ).order_by(similarity_expr.desc()).limit(limit)
        
        # Execute query and format results
        results = []
        for criteria, similarity in query_with_similarity.all():
            results.append((criteria, float(similarity)))
        
        return results
    
    async def find_similar_criteria(
        self,
        db: Session,
        criteria_id: int,
        limit: int = 5,
        similarity_threshold: float = 0.6
    ) -> List[Tuple[AcceptanceCriteria, float]]:
        """
        Find acceptance criteria similar to the given criteria based on embeddings.
        
        Args:
            db: Database session
            criteria_id: ID of the reference criteria
            limit: Maximum number of similar criteria to return
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of tuples containing (AcceptanceCriteria, similarity_score)
        """
        # Get the reference criteria
        reference_criteria = self.get(db, id=criteria_id)
        if not reference_criteria:
            return []
        
        # Check if reference criteria has embedding
        if not reference_criteria.embedding:
            return []
        
        # Query for similar criteria
        query = db.query(self.model).filter(
            and_(
                self.model.id != criteria_id,  # Exclude the reference criteria
                self.model.embedding.isnot(None)  # Only criteria with embeddings
            )
        )
        
        # Calculate cosine similarity
        similarity_expr = 1 - self.model.embedding.cosine_distance(reference_criteria.embedding)
        
        # Filter by similarity threshold and order by similarity
        results_query = query.add_columns(
            similarity_expr.label('similarity')
        ).filter(
            similarity_expr >= similarity_threshold
        ).order_by(similarity_expr.desc()).limit(limit)
        
        # Execute query and format results
        results = []
        for criteria, similarity in results_query.all():
            results.append((criteria, float(similarity)))
        
        return results
    
    async def update_embedding(self, db: Session, criteria_id: int, force: bool = False) -> bool:
        """
        Update embedding for a specific acceptance criteria.
        
        Args:
            db: Database session
            criteria_id: ID of the criteria to update
            force: Force update even if embedding is up to date
            
        Returns:
            True if successful, False otherwise
        """
        return await embedding_service.update_acceptance_criteria_embedding(db, criteria_id)
    
    async def update_all_embeddings(
        self, 
        db: Session, 
        backlog_id: Optional[int] = None,
        force: bool = False
    ) -> Dict[str, int]:
        """
        Update embeddings for all acceptance criteria.
        
        Args:
            db: Database session
            backlog_id: Optional backlog ID to filter criteria
            force: Force update all embeddings
            
        Returns:
            Dictionary with update statistics
        """
        return await embedding_service.update_all_acceptance_criteria_embeddings(db, backlog_id, force)


acceptance_criteria = CRUDAcceptanceCriteria(AcceptanceCriteria) 