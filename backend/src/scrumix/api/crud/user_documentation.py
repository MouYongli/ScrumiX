"""
User-Documentation association CRUD operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from scrumix.api.models.user_documentation import UserDocumentation, UserDocumentationRole
from scrumix.api.models.user import User
from scrumix.api.crud.base import CRUDBase

class UserDocumentationCRUD(CRUDBase[UserDocumentation, dict, dict]):
    def __init__(self):
        super().__init__(UserDocumentation)
    
    def create_user_documentation(self, db: Session, user_id: int, documentation_id: int, 
                                 role: UserDocumentationRole = UserDocumentationRole.AUTHOR) -> UserDocumentation:
        """Create a new user-documentation association"""
        # Check if association already exists
        existing = self.get_by_user_and_documentation(db, user_id, documentation_id)
        if existing:
            # Update role if association exists
            existing.role = role
            db.commit()
            db.refresh(existing)
            return existing
        
        # Create new association
        db_user_documentation = UserDocumentation(
            user_id=user_id,
            documentation_id=documentation_id,
            role=role
        )
        
        db.add(db_user_documentation)
        db.commit()
        db.refresh(db_user_documentation)
        return db_user_documentation
    
    def get_by_user_and_documentation(self, db: Session, user_id: int, documentation_id: int) -> Optional[UserDocumentation]:
        """Get user-documentation association by user ID and documentation ID"""
        return db.query(UserDocumentation).filter(
            and_(
                UserDocumentation.user_id == user_id,
                UserDocumentation.documentation_id == documentation_id
            )
        ).first()
    
    def get_users_by_documentation(self, db: Session, documentation_id: int) -> List[User]:
        """Get all users associated with a documentation item"""
        return db.query(User).join(UserDocumentation).filter(
            UserDocumentation.documentation_id == documentation_id
        ).all()
    
    def get_documentations_by_user(self, db: Session, user_id: int) -> List[dict]:
        """Get all documentations associated with a user"""
        from scrumix.api.models.documentation import Documentation
        
        return db.query(Documentation, UserDocumentation.role).join(UserDocumentation).filter(
            UserDocumentation.user_id == user_id
        ).all()
    
    def get_authors_by_documentation(self, db: Session, documentation_id: int) -> List[User]:
        """Get all authors of a documentation item"""
        return db.query(User).join(UserDocumentation).filter(
            and_(
                UserDocumentation.documentation_id == documentation_id,
                UserDocumentation.role == UserDocumentationRole.AUTHOR
            )
        ).all()
    
    def get_editors_by_documentation(self, db: Session, documentation_id: int) -> List[User]:
        """Get all editors of a documentation item"""
        return db.query(User).join(UserDocumentation).filter(
            and_(
                UserDocumentation.documentation_id == documentation_id,
                UserDocumentation.role == UserDocumentationRole.EDITOR
            )
        ).all()
    
    def get_viewers_by_documentation(self, db: Session, documentation_id: int) -> List[User]:
        """Get all viewers of a documentation item"""
        return db.query(User).join(UserDocumentation).filter(
            and_(
                UserDocumentation.documentation_id == documentation_id,
                UserDocumentation.role == UserDocumentationRole.VIEWER
            )
        ).all()
    
    def update_user_role(self, db: Session, user_id: int, documentation_id: int, 
                        new_role: UserDocumentationRole) -> Optional[UserDocumentation]:
        """Update user role for a documentation item"""
        user_doc = self.get_by_user_and_documentation(db, user_id, documentation_id)
        if not user_doc:
            return None
        
        user_doc.role = new_role
        db.commit()
        db.refresh(user_doc)
        return user_doc
    
    def remove_user_from_documentation(self, db: Session, user_id: int, documentation_id: int) -> bool:
        """Remove user association from a documentation item"""
        user_doc = self.get_by_user_and_documentation(db, user_id, documentation_id)
        if not user_doc:
            return False
        
        db.delete(user_doc)
        db.commit()
        return True
    
    def remove_all_users_from_documentation(self, db: Session, documentation_id: int) -> int:
        """Remove all user associations from a documentation item"""
        deleted_count = db.query(UserDocumentation).filter(
            UserDocumentation.documentation_id == documentation_id
        ).delete()
        db.commit()
        return deleted_count

# Create instance
user_documentation_crud = UserDocumentationCRUD()
