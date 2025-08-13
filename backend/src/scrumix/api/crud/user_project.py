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
        query = db.query(User, UserProject.role).join(UserProject).filter(UserProject.project_id == project_id)
        
        if role:
            query = query.filter(UserProject.role == role)
            
        results = query.all()
        return [{"user": user, "role": role} for user, role in results]

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
        role: ScrumRole = ScrumRole.DEVELOPER
    ) -> UserProject:
        """Add a user to a project with specified Scrum role"""
        # Check if relationship already exists
        existing = db.query(UserProject).filter(
            and_(
                UserProject.user_id == user_id,
                UserProject.project_id == project_id
            )
        ).first()
        
        if existing:
            # Update role if different
            if existing.role != role:
                existing.role = role
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
            role=role
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

# Create CRUD instance
user_project_crud = UserProjectCRUD(UserProject)