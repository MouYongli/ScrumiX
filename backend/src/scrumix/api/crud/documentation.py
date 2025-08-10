"""
Documentation-related CRUD operations
"""
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from scrumix.api.models.documentation import Documentation, DocumentationType
from scrumix.api.schemas.documentation import DocumentationCreate, DocumentationUpdate
from scrumix.api.crud.base import CRUDBase

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
            file_url=documentation_create.file_url,
            project_id=documentation_create.project_id
        )
        
        db.add(db_documentation)
        db.commit()
        db.refresh(db_documentation)
        return db_documentation
    
    def get_by_id(self, db: Session, doc_id: int) -> Optional[Documentation]:
        """Get documentation by ID"""
        return self.get(db, doc_id)
    
    def get_by_title(self, db: Session, title: str) -> Optional[Documentation]:
        """Get documentation by title"""
        return db.query(Documentation).filter(Documentation.title == title).first()
    
    def get_documentations(self, db: Session, skip: int = 0, limit: int = 100, 
                          doc_type: Optional[DocumentationType] = None) -> List[Documentation]:
        """Get list of documentation items"""
        query = db.query(Documentation)
        
        if doc_type:
            query = query.filter(Documentation.type == doc_type)
        
        return query.order_by(Documentation.updated_at.desc()).offset(skip).limit(limit).all()
    
    def search_documentations(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Documentation]:
        """Search documentation items by title and description"""
        query = db.query(Documentation).filter(
            or_(
                Documentation.title.ilike(f"%{search_term}%"),
                Documentation.description.ilike(f"%{search_term}%")
            )
        )
        
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