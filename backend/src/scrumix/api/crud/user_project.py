"""
User-Project relationship CRUD operations with Scrum roles
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status

from scrumix.api.models.user_project import UserProject, ScrumRole
from scrumix.api.models.project import Project
from scrumix.api.models.user import User
from scrumix.api.crud.base import CRUDBase

class UserProjectCRUD(CRUDBase[UserProject, dict, dict]):
    def get_user_projects(
        self, 
        db: Session, 
        user_id: int,
        role: Optional[ScrumRole] = None
    ) -> List[Project]:
        """Get all projects for a user with optional role filter"""
        query = db.query(Project).join(UserProject).filter(UserProject.user_id == user_id)
        
        if role:
            query = query.filter(UserProject.role == role)
            
        return query.all()

    def get_project_members(
        self, 
        db: Session, 
        project_id: int,
        role: Optional[ScrumRole] = None
    ) -> List[Dict[str, Any]]:
        """Get all members of a project with optional role filter"""
        query = db.query(User, UserProject.role, UserProject.is_owner).join(UserProject).filter(UserProject.project_id == project_id)
        
        if role:
            query = query.filter(UserProject.role == role)
            
        results = query.all()
        return [{"user": user, "role": role, "is_owner": is_owner} for user, role, is_owner in results]

    def get_user_role(
        self, 
        db: Session, 
        user_id: int, 
        project_id: int
    ) -> Optional[ScrumRole]:
        """Get user's Scrum role in a project"""
        user_project = db.query(UserProject).filter(
            and_(
                UserProject.user_id == user_id,
                UserProject.project_id == project_id
            )
        ).first()
        
        return user_project.role if user_project else None

    def add_user_to_project(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        role: ScrumRole = ScrumRole.DEVELOPER,
        is_owner: bool = False
    ) -> UserProject:
        """Add a user to a project with specified Scrum role and ownership"""
        # Check ownership constraint first
        if is_owner:
            existing_owner = db.query(UserProject).filter(
                and_(
                    UserProject.project_id == project_id,
                    UserProject.is_owner == True
                )
            ).first()
            if existing_owner:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project already has an owner"
                )
        
        # Check if relationship already exists
        existing = db.query(UserProject).filter(
            and_(
                UserProject.user_id == user_id,
                UserProject.project_id == project_id
            )
        ).first()
        
        if existing:
            # Update role and ownership if different
            updated = False
            if existing.role != role:
                existing.role = role
                updated = True
            if existing.is_owner != is_owner:
                existing.is_owner = is_owner
                updated = True
            if updated:
                db.commit()
                db.refresh(existing)
            return existing
        
        # Check role constraints
        if role == ScrumRole.SCRUM_MASTER:
            # Check if project already has a Scrum Master
            existing_sm = db.query(UserProject).filter(
                and_(
                    UserProject.project_id == project_id,
                    UserProject.role == ScrumRole.SCRUM_MASTER
                )
            ).first()
            if existing_sm:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project already has a Scrum Master"
                )
                
        elif role == ScrumRole.PRODUCT_OWNER:
            # Check if project already has a Product Owner
            existing_po = db.query(UserProject).filter(
                and_(
                    UserProject.project_id == project_id,
                    UserProject.role == ScrumRole.PRODUCT_OWNER
                )
            ).first()
            if existing_po:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project already has a Product Owner"
                )
        
        # Create new relationship
        user_project = UserProject(
            user_id=user_id,
            project_id=project_id,
            role=role,
            is_owner=is_owner
        )
        db.add(user_project)
        db.commit()
        db.refresh(user_project)
        return user_project

    def remove_user_from_project(
        self,
        db: Session,
        user_id: int,
        project_id: int
    ) -> bool:
        """Remove a user from a project"""
        try:
            user_project = db.query(UserProject).filter(
                and_(
                    UserProject.user_id == user_id,
                    UserProject.project_id == project_id
                )
            ).first()
            
            if user_project:
                db.delete(user_project)
                db.commit()
                return True
            return False
            
        except Exception:
            db.rollback()
            return False

    def update_user_role(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        new_role: ScrumRole
    ) -> Optional[UserProject]:
        """Update a user's Scrum role in a project"""
        try:
            user_project = db.query(UserProject).filter(
                and_(
                    UserProject.user_id == user_id,
                    UserProject.project_id == project_id
                )
            ).first()
            
            if user_project:
                user_project.role = new_role
                db.commit()
                db.refresh(user_project)
                
            return user_project
            
        except Exception:
            db.rollback()
            raise

    def get_project_scrum_master(self, db: Session, project_id: int) -> Optional[User]:
        """Get the Scrum Master of a project"""
        result = db.query(User).join(UserProject).filter(
            and_(
                UserProject.project_id == project_id,
                UserProject.role == ScrumRole.SCRUM_MASTER
            )
        ).first()
        return result

    def get_project_product_owner(self, db: Session, project_id: int) -> Optional[User]:
        """Get the Product Owner of a project"""
        result = db.query(User).join(UserProject).filter(
            and_(
                UserProject.project_id == project_id,
                UserProject.role == ScrumRole.PRODUCT_OWNER
            )
        ).first()
        return result

    def get_project_developers(self, db: Session, project_id: int) -> List[User]:
        """Get all developers in a project"""
        return db.query(User).join(UserProject).filter(
            and_(
                UserProject.project_id == project_id,
                UserProject.role == ScrumRole.DEVELOPER
            )
        ).all()

    def check_user_access(
        self,
        db: Session,
        user_id: int,
        project_id: int
    ) -> bool:
        """Check if user has access to project"""
        return db.query(UserProject).filter(
            and_(
                UserProject.user_id == user_id,
                UserProject.project_id == project_id
            )
        ).first() is not None

    def get_project_owner(self, db: Session, project_id: int) -> Optional[User]:
        """Get the owner of a project"""
        result = db.query(User).join(UserProject).filter(
            and_(
                UserProject.project_id == project_id,
                UserProject.is_owner == True
            )
        ).first()
        return result

    def is_user_project_owner(
        self, 
        db: Session, 
        user_id: int, 
        project_id: int
    ) -> bool:
        """Check if user is the owner of a project"""
        user_project = db.query(UserProject).filter(
            and_(
                UserProject.user_id == user_id,
                UserProject.project_id == project_id,
                UserProject.is_owner == True
            )
        ).first()
        return user_project is not None

    def transfer_ownership(
        self,
        db: Session,
        current_owner_id: int,
        new_owner_id: int,
        project_id: int
    ) -> bool:
        """Transfer project ownership from current owner to new owner"""
        try:
            # Verify current owner
            current_owner_relation = db.query(UserProject).filter(
                and_(
                    UserProject.user_id == current_owner_id,
                    UserProject.project_id == project_id,
                    UserProject.is_owner == True
                )
            ).first()
            
            if not current_owner_relation:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not the project owner"
                )
            
            # Check if new owner is already a member of the project
            new_owner_relation = db.query(UserProject).filter(
                and_(
                    UserProject.user_id == new_owner_id,
                    UserProject.project_id == project_id
                )
            ).first()
            
            if not new_owner_relation:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New owner must be a member of the project"
                )
            
            # Transfer ownership
            current_owner_relation.is_owner = False
            new_owner_relation.is_owner = True
            
            db.commit()
            return True
            
        except HTTPException:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            return False

    def assign_scrum_role(
        self,
        db: Session,
        assigner_id: int,
        target_user_id: int,
        project_id: int,
        new_role: ScrumRole
    ) -> Optional[UserProject]:
        """Assign or update Scrum role for a user (only project owner can do this)"""
        try:
            # Check if assigner is project owner
            if not self.is_user_project_owner(db, assigner_id, project_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only project owner can assign roles"
                )
            
            # Check if target user is in the project
            target_relation = db.query(UserProject).filter(
                and_(
                    UserProject.user_id == target_user_id,
                    UserProject.project_id == project_id
                )
            ).first()
            
            if not target_relation:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target user is not a member of the project"
                )
            
            # Check role constraints (same as existing logic)
            if new_role == ScrumRole.SCRUM_MASTER:
                existing_sm = db.query(UserProject).filter(
                    and_(
                        UserProject.project_id == project_id,
                        UserProject.role == ScrumRole.SCRUM_MASTER,
                        UserProject.user_id != target_user_id
                    )
                ).first()
                if existing_sm:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Project already has a Scrum Master"
                    )
                    
            elif new_role == ScrumRole.PRODUCT_OWNER:
                existing_po = db.query(UserProject).filter(
                    and_(
                        UserProject.project_id == project_id,
                        UserProject.role == ScrumRole.PRODUCT_OWNER,
                        UserProject.user_id != target_user_id
                    )
                ).first()
                if existing_po:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Project already has a Product Owner"
                    )
            
            # Update role
            target_relation.role = new_role
            db.commit()
            db.refresh(target_relation)
            
            return target_relation
            
        except HTTPException:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

# Create CRUD instance
user_project_crud = UserProjectCRUD(UserProject)