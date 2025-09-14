"""
Optimized CRUD operations for Backlog
"""
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
from datetime import datetime, timedelta
import math
import re
from collections import Counter

from .base import CRUDBase
from ..models.backlog import Backlog, BacklogStatus, BacklogPriority, BacklogType
from ..schemas.backlog import BacklogCreate, BacklogUpdate
from ..core.embedding_service import embedding_service

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
        include_children: bool = False,
        include_acceptance_criteria: bool = False
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
        
        # Include acceptance criteria if requested
        if include_acceptance_criteria:
            query = query.options(joinedload(Backlog.acceptance_criteria))
        
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
    
    def search_backlogs_by_project(
        self,
        db: Session,
        project_id: int,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Backlog]:
        """Search backlog items by project ID and search query."""
        if not query:
            return []
        
        search_pattern = f"%{query}%"
        search_filter = or_(
            Backlog.title.ilike(search_pattern),
            Backlog.description.ilike(search_pattern)
        )
        
        return (
            db.query(Backlog)
            .filter(Backlog.project_id == project_id)
            .filter(search_filter)
            .order_by(Backlog.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
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
    
    async def semantic_search(
        self,
        db: Session,
        query: str,
        project_id: Optional[int] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[Backlog, float]]:
        """
        Perform semantic search on backlog items using vector embeddings
        
        Args:
            db: Database session
            query: Search query text
            project_id: Optional project ID to filter results
            limit: Maximum number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of tuples containing (Backlog, similarity_score)
        """
        # Generate embedding for the search query
        query_embedding = await embedding_service.generate_embedding(query)
        if not query_embedding:
            return []
        
        # Build base query
        base_query = db.query(Backlog).filter(Backlog.embedding.isnot(None))
        
        if project_id:
            base_query = base_query.filter(Backlog.project_id == project_id)
        
        # Calculate cosine similarity and order by similarity
        # Using cosine distance (1 - cosine similarity) for ordering
        similarity_query = base_query.add_columns(
            (1 - Backlog.embedding.cosine_distance(query_embedding)).label('similarity')
        ).filter(
            (1 - Backlog.embedding.cosine_distance(query_embedding)) >= similarity_threshold
        ).order_by(
            Backlog.embedding.cosine_distance(query_embedding).asc()
        ).limit(limit)
        
        results = []
        for backlog, similarity in similarity_query.all():
            results.append((backlog, float(similarity)))
        
        return results
    
    def _calculate_bm25_score(
        self,
        query_terms: List[str],
        document_text: str,
        corpus_stats: Dict[str, Any],
        k1: float = 1.5,
        b: float = 0.75
    ) -> float:
        """
        Calculate BM25 score for a document given query terms
        
        Args:
            query_terms: List of query terms
            document_text: Document text to score
            corpus_stats: Statistics about the corpus (avg_doc_length, doc_count, term_frequencies)
            k1: BM25 parameter k1 (term frequency saturation point)
            b: BM25 parameter b (length normalization)
            
        Returns:
            BM25 score
        """
        if not document_text or not query_terms:
            return 0.0
        
        # Tokenize and normalize document
        doc_terms = self._tokenize_text(document_text.lower())
        doc_length = len(doc_terms)
        
        if doc_length == 0:
            return 0.0
        
        # Calculate term frequencies in document
        doc_term_freq = Counter(doc_terms)
        
        # Get corpus statistics
        avg_doc_length = corpus_stats.get('avg_doc_length', 100)
        total_docs = corpus_stats.get('doc_count', 1)
        term_doc_frequencies = corpus_stats.get('term_doc_frequencies', {})
        
        score = 0.0
        
        for term in query_terms:
            term = term.lower()
            
            # Term frequency in document
            tf = doc_term_freq.get(term, 0)
            
            if tf == 0:
                continue
            
            # Document frequency (how many documents contain this term)
            df = term_doc_frequencies.get(term, 1)
            
            # Inverse document frequency
            idf = math.log((total_docs - df + 0.5) / (df + 0.5))
            
            # BM25 formula
            numerator = tf * (k1 + 1)
            denominator = tf + k1 * (1 - b + b * (doc_length / avg_doc_length))
            
            score += idf * (numerator / denominator)
        
        return max(0.0, score)
    
    def _tokenize_text(self, text: str) -> List[str]:
        """
        Simple tokenization - split on whitespace and punctuation
        """
        # Remove punctuation and split on whitespace
        tokens = re.findall(r'\b\w+\b', text.lower())
        return [token for token in tokens if len(token) > 1]  # Filter out single characters
    
    def _get_corpus_statistics(self, db: Session, project_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Calculate corpus statistics needed for BM25 scoring
        """
        # Get all backlog items for statistics
        query = db.query(Backlog)
        if project_id:
            query = query.filter(Backlog.project_id == project_id)
        
        backlogs = query.all()
        
        if not backlogs:
            return {
                'doc_count': 1,
                'avg_doc_length': 100,
                'term_doc_frequencies': {}
            }
        
        # Calculate document lengths and term frequencies
        doc_lengths = []
        term_doc_frequencies = Counter()
        
        for backlog in backlogs:
            doc_text = backlog.get_searchable_content()
            tokens = self._tokenize_text(doc_text)
            doc_lengths.append(len(tokens))
            
            # Count unique terms in this document
            unique_terms = set(tokens)
            for term in unique_terms:
                term_doc_frequencies[term] += 1
        
        avg_doc_length = sum(doc_lengths) / len(doc_lengths) if doc_lengths else 100
        
        return {
            'doc_count': len(backlogs),
            'avg_doc_length': avg_doc_length,
            'term_doc_frequencies': dict(term_doc_frequencies)
        }
    
    def _reciprocal_rank_fusion(
        self,
        semantic_results: List[Tuple[Backlog, float]],
        keyword_results: List[Tuple[Backlog, float]],
        k: int = 60
    ) -> List[Tuple[Backlog, float]]:
        """
        Implement Reciprocal Rank Fusion (RRF) algorithm
        
        RRF Score = Σ(1 / (k + rank_i)) for all rankings where item appears
        
        Args:
            semantic_results: List of (backlog, score) from semantic search
            keyword_results: List of (backlog, score) from BM25 search
            k: RRF parameter (typically 60)
            
        Returns:
            List of (backlog, rrf_score) sorted by RRF score
        """
        rrf_scores = {}
        
        # Process semantic results
        for rank, (backlog, score) in enumerate(semantic_results):
            if backlog.id not in rrf_scores:
                rrf_scores[backlog.id] = {
                    'backlog': backlog,
                    'rrf_score': 0.0,
                    'semantic_score': score,
                    'bm25_score': 0.0
                }
            
            # Add RRF contribution from semantic ranking
            rrf_scores[backlog.id]['rrf_score'] += 1.0 / (k + rank + 1)
            rrf_scores[backlog.id]['semantic_score'] = score
        
        # Process BM25 results
        for rank, (backlog, score) in enumerate(keyword_results):
            if backlog.id not in rrf_scores:
                rrf_scores[backlog.id] = {
                    'backlog': backlog,
                    'rrf_score': 0.0,
                    'semantic_score': 0.0,
                    'bm25_score': score
                }
            
            # Add RRF contribution from BM25 ranking
            rrf_scores[backlog.id]['rrf_score'] += 1.0 / (k + rank + 1)
            rrf_scores[backlog.id]['bm25_score'] = score
        
        # Sort by RRF score and return
        sorted_results = sorted(
            rrf_scores.values(),
            key=lambda x: x['rrf_score'],
            reverse=True
        )
        
        return [(item['backlog'], item['rrf_score']) for item in sorted_results]
    
    async def bm25_search(
        self,
        db: Session,
        query: str,
        project_id: Optional[int] = None,
        limit: int = 10
    ) -> List[Tuple[Backlog, float]]:
        """
        Perform BM25 keyword search on backlog items
        
        Args:
            db: Database session
            query: Search query text
            project_id: Optional project ID to filter results
            limit: Maximum number of results to return
            
        Returns:
            List of tuples containing (Backlog, bm25_score)
        """
        # Get query terms
        query_terms = self._tokenize_text(query)
        if not query_terms:
            return []
        
        # Get corpus statistics
        corpus_stats = self._get_corpus_statistics(db, project_id)
        
        # Get candidate documents (use broad search to get candidates)
        candidates = self.search_backlogs_by_project(
            db, project_id, query, 0, limit * 3
        ) if project_id else self.search_backlogs(db, query, 0, limit * 3)
        
        # If no candidates from basic search, get all items for BM25 scoring
        if not candidates:
            query_filter = db.query(Backlog)
            if project_id:
                query_filter = query_filter.filter(Backlog.project_id == project_id)
            candidates = query_filter.limit(limit * 5).all()
        
        # Calculate BM25 scores
        scored_results = []
        for backlog in candidates:
            doc_text = backlog.get_searchable_content()
            bm25_score = self._calculate_bm25_score(query_terms, doc_text, corpus_stats)
            
            if bm25_score > 0.0:  # Only include items with non-zero scores
                scored_results.append((backlog, bm25_score))
        
        # Sort by BM25 score and limit
        scored_results.sort(key=lambda x: x[1], reverse=True)
        return scored_results[:limit]
    
    async def hybrid_search(
        self,
        db: Session,
        query: str,
        project_id: Optional[int] = None,
        limit: int = 10,
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3,
        similarity_threshold: float = 0.5,
        use_rrf: bool = True
    ) -> List[Tuple[Backlog, float]]:
        """
        Perform hybrid search combining semantic embeddings with BM25 keyword search
        
        Uses either Reciprocal Rank Fusion (RRF) or weighted scoring:
        - RRF: Industry standard that combines rankings from both methods
        - Weighted: final_score = α * semantic_similarity + β * bm25_score
        
        Args:
            db: Database session
            query: Search query text
            project_id: Optional project ID to filter results
            limit: Maximum number of results to return
            semantic_weight: Weight for semantic search (used in weighted mode)
            keyword_weight: Weight for BM25 search (used in weighted mode)
            similarity_threshold: Minimum similarity score for semantic results
            use_rrf: If True, use RRF algorithm; if False, use weighted scoring
            
        Returns:
            List of tuples containing (Backlog, combined_score)
        """
        # Get semantic search results
        semantic_results = await self.semantic_search(
            db, query, project_id, limit * 2, similarity_threshold
        )
        
        # Get BM25 keyword search results
        bm25_results = await self.bm25_search(
            db, query, project_id, limit * 2
        )
        
        if use_rrf:
            # Use Reciprocal Rank Fusion (recommended for production)
            return self._reciprocal_rank_fusion(semantic_results, bm25_results)[:limit]
        else:
            # Use weighted scoring (legacy mode)
            combined_scores = {}
            
            # Add semantic scores
            for backlog, semantic_score in semantic_results:
                combined_scores[backlog.id] = {
                    'backlog': backlog,
                    'semantic_score': semantic_score,
                    'bm25_score': 0.0
                }
            
            # Add BM25 scores
            for backlog, bm25_score in bm25_results:
                if backlog.id in combined_scores:
                    combined_scores[backlog.id]['bm25_score'] = bm25_score
                else:
                    combined_scores[backlog.id] = {
                        'backlog': backlog,
                        'semantic_score': 0.0,
                        'bm25_score': bm25_score
                    }
            
            # Calculate weighted scores
            final_results = []
            for item_id, scores in combined_scores.items():
                # Normalize scores to 0-1 range for fair weighting
                normalized_semantic = scores['semantic_score']  # Already 0-1
                normalized_bm25 = min(1.0, scores['bm25_score'] / 10.0)  # Normalize BM25 (rough)
                
                combined_score = (
                    normalized_semantic * semantic_weight +
                    normalized_bm25 * keyword_weight
                )
                final_results.append((scores['backlog'], combined_score))
            
            # Sort by combined score and limit results
            final_results.sort(key=lambda x: x[1], reverse=True)
            return final_results[:limit]
    
    async def find_similar_backlogs(
        self,
        db: Session,
        backlog_id: int,
        limit: int = 5,
        similarity_threshold: float = 0.6
    ) -> List[Tuple[Backlog, float]]:
        """
        Find similar backlog items to a given backlog
        
        Args:
            db: Database session
            backlog_id: ID of the reference backlog item
            limit: Maximum number of similar items to return
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of tuples containing (Backlog, similarity_score)
        """
        # Get the reference backlog with its embedding
        reference_backlog = db.query(Backlog).filter(Backlog.id == backlog_id).first()
        if not reference_backlog or not reference_backlog.embedding:
            return []
        
        # Find similar items
        similar_query = db.query(Backlog).filter(
            and_(
                Backlog.id != backlog_id,  # Exclude the reference item
                Backlog.embedding.isnot(None),
                Backlog.project_id == reference_backlog.project_id  # Same project
            )
        ).add_columns(
            (1 - Backlog.embedding.cosine_distance(reference_backlog.embedding)).label('similarity')
        ).filter(
            (1 - Backlog.embedding.cosine_distance(reference_backlog.embedding)) >= similarity_threshold
        ).order_by(
            Backlog.embedding.cosine_distance(reference_backlog.embedding).asc()
        ).limit(limit)
        
        results = []
        for backlog, similarity in similar_query.all():
            results.append((backlog, float(similarity)))
        
        return results
    
    async def update_embedding(self, db: Session, backlog_id: int, force: bool = False) -> bool:
        """
        Update embedding for a specific backlog item
        
        Args:
            db: Database session
            backlog_id: ID of the backlog item to update
            force: Force update even if embedding is up to date
            
        Returns:
            True if successful, False otherwise
        """
        return await embedding_service.update_backlog_embedding(db, backlog_id)
    
    async def update_all_embeddings(
        self, 
        db: Session, 
        project_id: Optional[int] = None, 
        force: bool = False
    ) -> Dict[str, int]:
        """
        Update embeddings for all backlog items
        
        Args:
            db: Database session
            project_id: Optional project ID to filter backlogs
            force: Force update all embeddings
            
        Returns:
            Dictionary with update statistics
        """
        return await embedding_service.update_all_backlog_embeddings(db, project_id, force)

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