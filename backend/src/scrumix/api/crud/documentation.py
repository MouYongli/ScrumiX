"""
Documentation-related CRUD operations
"""
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from scrumix.api.models.documentation import Documentation, DocumentationType
from scrumix.api.schemas.documentation import DocumentationCreate, DocumentationUpdate
from scrumix.api.crud.base import CRUDBase
from scrumix.api.crud.user_documentation import user_documentation_crud
from ..core.embedding_service import embedding_service

class DocumentationCRUD(CRUDBase[Documentation, DocumentationCreate, DocumentationUpdate]):
    def create_documentation(self, db: Session, documentation_create: DocumentationCreate) -> Documentation:
        """Create a new documentation item"""
        # Validate title uniqueness
        existing_doc = self.get_by_title(db, documentation_create.title)
        if existing_doc:
            raise ValueError("Documentation with this title already exists")
        
        # Create documentation object
        db_documentation = Documentation(
            title=documentation_create.title,
            type=documentation_create.type,
            description=documentation_create.description,
            content=documentation_create.content,
            file_url=documentation_create.file_url,
            project_id=documentation_create.project_id
        )
        
        db.add(db_documentation)
        db.commit()
        db.refresh(db_documentation)
        
        # Handle author associations
        if documentation_create.author_ids:
            for user_id in documentation_create.author_ids:
                user_documentation_crud.create_user_documentation(
                    db, user_id, db_documentation.id, 
                    role="author"
                )
        
        return db_documentation
    
    def get_by_id(self, db: Session, doc_id: int) -> Optional[Documentation]:
        """Get documentation by ID"""
        return self.get(db, doc_id)
    
    def get_by_title(self, db: Session, title: str) -> Optional[Documentation]:
        """Get documentation by title"""
        return db.query(Documentation).filter(Documentation.title == title).first()
    
    def get_documentations(self, db: Session, skip: int = 0, limit: int = 100, 
                          doc_type: Optional[DocumentationType] = None,
                          project_id: Optional[int] = None) -> List[Documentation]:
        """Get list of documentation items"""
        query = db.query(Documentation)
        
        if doc_type:
            query = query.filter(Documentation.type == doc_type)
        
        if project_id:
            query = query.filter(Documentation.project_id == project_id)
        
        return query.order_by(Documentation.updated_at.desc()).offset(skip).limit(limit).all()
    
    def search_documentations(self, db: Session, search_term: str, skip: int = 0, limit: int = 100,
                            project_id: Optional[int] = None) -> List[Documentation]:
        """Search documentation items by title and description"""
        query = db.query(Documentation).filter(
            or_(
                Documentation.title.ilike(f"%{search_term}%"),
                Documentation.description.ilike(f"%{search_term}%")
            )
        )
        
        if project_id:
            query = query.filter(Documentation.project_id == project_id)
        
        return query.order_by(Documentation.updated_at.desc()).offset(skip).limit(limit).all()
    
    def search_by_file_url(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Documentation]:
        """Search documentation items by file URL pattern"""
        query = db.query(Documentation).filter(
            Documentation.file_url.ilike(f"%{search_term}%")
        )
        
        return query.order_by(Documentation.updated_at.desc()).offset(skip).limit(limit).all()
    
    def update_documentation(self, db: Session, doc_id: int, documentation_update: DocumentationUpdate) -> Optional[Documentation]:
        """Update documentation information"""
        documentation = self.get_by_id(db, doc_id)
        if not documentation:
            return None
        
        update_data = documentation_update.model_dump(exclude_unset=True)
        
        # Check if title is already in use (if being updated)
        if "title" in update_data and update_data["title"] != documentation.title:
            existing_doc = self.get_by_title(db, update_data["title"])
            if existing_doc and existing_doc.id != doc_id:
                raise ValueError("Documentation title already in use")
        
        # Handle author associations update
        if "author_ids" in update_data:
            # Remove existing author associations
            user_documentation_crud.remove_all_users_from_documentation(db, doc_id)
            
            # Add new author associations
            if update_data["author_ids"]:
                for user_id in update_data["author_ids"]:
                    user_documentation_crud.create_user_documentation(
                        db, user_id, doc_id, 
                        role="author"
                    )
            
            # Remove author_ids from update_data since we've handled it separately
            del update_data["author_ids"]
        
        for field, value in update_data.items():
            setattr(documentation, field, value)
        
        # Update timestamp is handled automatically by SQLAlchemy
        db.commit()
        db.refresh(documentation)
        return documentation
    
    def delete_documentation(self, db: Session, doc_id: int) -> bool:
        """Delete documentation item"""
        documentation = self.get_by_id(db, doc_id)
        if not documentation:
            return False
        
        db.delete(documentation)
        db.commit()
        return True
    
    def get_documentations_by_type(self, db: Session, doc_type: DocumentationType,
                                  skip: int = 0, limit: int = 100) -> List[Documentation]:
        """Get documentation items by type"""
        return db.query(Documentation).filter(Documentation.type == doc_type)\
                 .order_by(Documentation.updated_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def get_recent_documentations(self, db: Session, days: int = 7, limit: int = 10) -> List[Documentation]:
        """Get recently created or updated documentation items"""
        since_date = datetime.now() - timedelta(days=days)
        
        return db.query(Documentation).filter(
            or_(
                Documentation.created_at >= since_date,
                Documentation.updated_at >= since_date
            )
        ).order_by(Documentation.updated_at.desc()).limit(limit).all()
    
    def count_documentations(self, db: Session, doc_type: Optional[DocumentationType] = None) -> int:
        """Count documentation items"""
        query = db.query(Documentation)
        if doc_type:
            query = query.filter(Documentation.type == doc_type)
        return query.count()
    
    def get_documentation_statistics(self, db: Session) -> dict:
        """Get documentation statistics"""
        total = self.count_documentations(db)
        
        # Count by type
        type_counts = {}
        for doc_type in DocumentationType:
            type_counts[doc_type.value] = self.count_documentations(db, doc_type)
        
        return {
            "total_documents": total,
            "documents_by_type": type_counts
        }

    def get_project_users(self, db: Session, project_id: int) -> List[dict]:
        """Get all users in a project for author selection"""
        from scrumix.api.models.user import User
        from scrumix.api.models.user_project import UserProject
        
        users = db.query(User).join(UserProject).filter(
            UserProject.project_id == project_id
        ).all()
        
        return [
            {
                "id": user.id,
                "full_name": user.full_name or user.username or user.email,
                "email": user.email,
                "username": user.username
            }
            for user in users
        ]

# Create CRUD instance
documentation_crud = DocumentationCRUD(Documentation)

# Export functions for test compatibility
def get_documentations(db: Session, skip: int = 0, limit: int = 100, **kwargs) -> List[Documentation]:
    """Get list of documentation items"""
    return documentation_crud.get_documentations(db, skip=skip, limit=limit, **kwargs)

def get_documentation(db: Session, doc_id: int) -> Optional[Documentation]:
    """Get documentation by ID"""
    return documentation_crud.get_by_id(db, doc_id)

def create_documentation(db: Session, documentation_create: DocumentationCreate) -> Documentation:
    """Create a new documentation item"""
    return documentation_crud.create_documentation(db, documentation_create)

def update_documentation(db: Session, doc_id: int, documentation_update: DocumentationUpdate) -> Optional[Documentation]:
    """Update documentation"""
    return documentation_crud.update_documentation(db, doc_id, documentation_update)

def delete_documentation(db: Session, doc_id: int) -> bool:
    """Delete documentation"""
    return documentation_crud.delete_documentation(db, doc_id)

# Add semantic search methods to the CRUD class
async def semantic_search_documentation_by_field(
    db: Session,
    query: str,
    field: str,  # 'title', 'description', or 'content'
    project_id: Optional[int] = None,
    limit: int = 10,
    similarity_threshold: float = 0.7
) -> List[Tuple[Documentation, float]]:
    """
    Perform semantic search on specific documentation field
    
    Args:
        db: Database session
        query: Search query text
        field: Which field to search ('title', 'description', 'content')
        project_id: Optional project ID to filter results
        limit: Maximum number of results
        similarity_threshold: Minimum similarity score
        
    Returns:
        List of tuples containing (Documentation, similarity_score)
    """
    # Generate embedding for the search query
    query_embedding = await embedding_service.generate_embedding(query)
    if not query_embedding:
        return []
    
    # Map field name to column
    field_mapping = {
        'title': Documentation.title_embedding,
        'description': Documentation.description_embedding,
        'content': Documentation.content_embedding
    }
    
    if field not in field_mapping:
        raise ValueError(f"Invalid field: {field}. Must be one of: {list(field_mapping.keys())}")
    
    embedding_column = field_mapping[field]
    
    # Build base query
    base_query = db.query(Documentation).filter(embedding_column.isnot(None))
    
    if project_id:
        base_query = base_query.filter(Documentation.project_id == project_id)
    
    # Calculate similarity and filter by threshold
    similarity_query = base_query.add_columns(
        (1 - embedding_column.cosine_distance(query_embedding)).label('similarity')
    ).filter(
        (1 - embedding_column.cosine_distance(query_embedding)) >= similarity_threshold
    ).order_by(
        embedding_column.cosine_distance(query_embedding).asc()
    ).limit(limit)
    
    results = []
    for documentation, similarity in similarity_query.all():
        results.append((documentation, float(similarity)))
    
    return results

async def semantic_search_documentation_multi_field(
    db: Session,
    query: str,
    fields: List[str] = ['title', 'description', 'content'],
    project_id: Optional[int] = None,
    limit: int = 10,
    similarity_threshold: float = 0.7
) -> List[Tuple[Documentation, Dict[str, float]]]:
    """
    Perform semantic search across multiple documentation fields
    
    Args:
        db: Database session
        query: Search query text
        fields: Which fields to search
        project_id: Optional project ID to filter results
        limit: Maximum number of results
        similarity_threshold: Minimum similarity score for any field
        
    Returns:
        List of tuples containing (Documentation, {field: similarity_score})
    """
    # Generate embedding for the search query
    query_embedding = await embedding_service.generate_embedding(query)
    if not query_embedding:
        return []
    
    # Map field names to columns
    field_mapping = {
        'title': Documentation.title_embedding,
        'description': Documentation.description_embedding,
        'content': Documentation.content_embedding
    }
    
    # Validate fields
    for field in fields:
        if field not in field_mapping:
            raise ValueError(f"Invalid field: {field}. Must be one of: {list(field_mapping.keys())}")
    
    # Build base query
    base_query = db.query(Documentation)
    
    if project_id:
        base_query = base_query.filter(Documentation.project_id == project_id)
    
    # Add similarity calculations for each field
    similarity_expressions = []
    similarity_labels = []
    
    for field in fields:
        embedding_column = field_mapping[field]
        similarity_expr = (1 - embedding_column.cosine_distance(query_embedding))
        similarity_expressions.append(similarity_expr)
        similarity_labels.append(f'{field}_similarity')
    
    # Add all similarity columns to the query
    query_with_similarities = base_query.add_columns(*similarity_expressions)
    
    # Filter: at least one field must meet the threshold
    threshold_conditions = []
    for expr in similarity_expressions:
        threshold_conditions.append(expr >= similarity_threshold)
    
    filtered_query = query_with_similarities.filter(or_(*threshold_conditions))
    
    # Order by the highest similarity across all fields
    max_similarity = func.greatest(*similarity_expressions)
    ordered_query = filtered_query.order_by(max_similarity.desc()).limit(limit)
    
    results = []
    for row in ordered_query.all():
        documentation = row[0]
        similarities = {}
        
        for i, field in enumerate(fields):
            similarities[field] = float(row[i + 1]) if row[i + 1] is not None else 0.0
        
        results.append((documentation, similarities))
    
    return results 