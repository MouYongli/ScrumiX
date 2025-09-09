from typing import Optional, List, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from .base import CRUDBase
from ..models.task import Task, TaskStatus
from ..models.user_task import UserTask
from ..schemas.task import TaskCreate, TaskUpdate
from ..core.embedding_service import embedding_service


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
    
    def search_tasks_by_project(
        self,
        db: Session,
        project_id: int,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Search tasks by project ID and search query."""
        search_filter = or_(
            self.model.title.ilike(f"%{query}%"),
            self.model.description.ilike(f"%{query}%")
        )
        
        return (
            db.query(self.model)
            .join(self.model.sprint)
            .filter(self.model.sprint.has(project_id=project_id))
            .filter(search_filter)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    async def semantic_search(
        self,
        db: Session,
        query: str,
        project_id: Optional[int] = None,
        sprint_id: Optional[int] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[Task, float]]:
        """
        Perform semantic search on tasks using combined embedding.
        
        Args:
            db: Database session
            query: Search query text
            project_id: Optional project ID filter
            sprint_id: Optional sprint ID filter
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score (0.0 to 1.0)
            
        Returns:
            List of tuples containing (Task, similarity_score)
        """
        # Generate embedding for the query
        query_embedding = await embedding_service.generate_embedding(query)
        if not query_embedding:
            return []
        
        # Build the base query
        base_query = db.query(self.model)
        
        # Apply filters
        if project_id:
            base_query = base_query.join(self.model.sprint).filter(
                self.model.sprint.has(project_id=project_id)
            )
        
        if sprint_id:
            base_query = base_query.filter(self.model.sprint_id == sprint_id)
        
        # Only include tasks that have embeddings
        base_query = base_query.filter(self.model.embedding.isnot(None))
        
        # Calculate cosine similarity and filter by threshold
        similarity_expr = 1 - self.model.embedding.cosine_distance(query_embedding)
        
        query_with_similarity = base_query.add_columns(similarity_expr.label('similarity')).filter(
            similarity_expr >= similarity_threshold
        ).order_by(similarity_expr.desc()).limit(limit)
        
        # Execute query and format results
        results = []
        for task, similarity in query_with_similarity.all():
            results.append((task, float(similarity)))
        
        return results
    
    async def find_similar_tasks(
        self,
        db: Session,
        task_id: int,
        limit: int = 5,
        similarity_threshold: float = 0.6
    ) -> List[Tuple[Task, float]]:
        """
        Find tasks similar to the given task based on combined embedding.
        
        Args:
            db: Database session
            task_id: ID of the reference task
            limit: Maximum number of similar tasks to return
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of tuples containing (Task, similarity_score)
        """
        # Get the reference task
        reference_task = self.get(db, id=task_id)
        if not reference_task:
            return []
        
        # Check if reference task has embedding
        if not reference_task.embedding:
            return []
        
        # Query for similar tasks
        query = db.query(self.model).filter(
            and_(
                self.model.id != task_id,  # Exclude the reference task
                self.model.embedding.isnot(None)  # Only tasks with embeddings
            )
        )
        
        # Calculate cosine similarity
        similarity_expr = 1 - self.model.embedding.cosine_distance(reference_task.embedding)
        
        # Filter by similarity threshold and order by similarity
        results_query = query.add_columns(
            similarity_expr.label('similarity')
        ).filter(
            similarity_expr >= similarity_threshold
        ).order_by(similarity_expr.desc()).limit(limit)
        
        # Execute query and format results
        results = []
        for task, similarity in results_query.all():
            results.append((task, float(similarity)))
        
        return results
    
    async def update_embedding(self, db: Session, task_id: int, force: bool = False) -> bool:
        """
        Update embeddings for a specific task.
        
        Args:
            db: Database session
            task_id: ID of the task to update
            force: Force update even if embeddings are up to date
            
        Returns:
            True if successful, False otherwise
        """
        return await embedding_service.update_task_embedding(db, task_id)
    
    async def update_all_embeddings(
        self, 
        db: Session, 
        project_id: Optional[int] = None,
        sprint_id: Optional[int] = None,
        force: bool = False
    ) -> Dict[str, int]:
        """
        Update embeddings for all tasks.
        
        Args:
            db: Database session
            project_id: Optional project ID to filter tasks
            sprint_id: Optional sprint ID to filter tasks
            force: Force update all embeddings
            
        Returns:
            Dictionary with update statistics
        """
        return await embedding_service.update_all_task_embeddings(db, project_id, sprint_id, force)


# Create instance
task_crud = CRUDTask(Task) 