"""
Project-related CRUD operations
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from scrumix.api.models.project import Project, ProjectStatus
from scrumix.api.models.user_project import ScrumRole, UserProject
from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate
from scrumix.api.crud.base import CRUDBase
from scrumix.api.crud.user_project import user_project_crud

class ProjectCRUD(CRUDBase[Project, ProjectCreate, ProjectUpdate]):
    def get_by_id(self, db: Session, project_id: int) -> Optional[Project]:
        """Get project by ID"""
        return self.get(db, project_id)
    
    def get_user_projects(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[ProjectStatus] = None
    ) -> List[Project]:
        """Get projects where the user is a member"""
        query = db.query(self.model).join(UserProject).filter(
            UserProject.user_id == user_id
        )
        
        if status:
            query = query.filter(self.model.status == status)
        
        return query.offset(skip).limit(limit).all()

    def search_user_projects(
        self, 
        db: Session, 
        user_id: int, 
        search_term: str,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Project]:
        """Search projects where the user is a member"""
        query = db.query(self.model).join(UserProject).filter(
            UserProject.user_id == user_id
        ).filter(
            or_(
                self.model.name.ilike(f"%{search_term}%"),
                self.model.description.ilike(f"%{search_term}%")
            )
        )
        
        return query.offset(skip).limit(limit).all()

    def get_by_name(self, db: Session, name: str) -> Optional[Project]:
        """Get project by name"""
        return db.query(self.model).filter(self.model.name == name).first()

    def update_project(
        self, 
        db: Session, 
        project_id: int, 
        project_update: ProjectUpdate,
        user_id: int
    ) -> Optional[Project]:
        """Update project with user permission check"""
        # Check if user has access to the project
        user_role = user_project_crud.get_user_role(db, user_id, project_id)
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this project"
            )
        
        # Only Scrum Master and Product Owner can update projects
        if user_role not in [ScrumRole.SCRUM_MASTER, ScrumRole.PRODUCT_OWNER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update project"
            )
        
        project = self.get_by_id(db, project_id)
        if not project:
            return None
        
        # Update project fields
        update_data = project_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        
        project.updated_at = datetime.now()
        db.commit()
        db.refresh(project)
        
        return project

    def delete_project(
        self, 
        db: Session, 
        project_id: int, 
        user_id: int
    ) -> bool:
        """Delete project with user permission check"""
        # Check if user has access to the project
        user_role = user_project_crud.get_user_role(db, user_id, project_id)
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this project"
            )
        
        # Only Scrum Master can delete projects
        if user_role != ScrumRole.SCRUM_MASTER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Scrum Master can delete projects"
            )
        
        project = self.get_by_id(db, project_id)
        if not project:
            return False
        
        db.delete(project)
        db.commit()
        
        return True

    def create_project(
        self, 
        db: Session, 
        project_create: ProjectCreate,
        creator_id: int
    ) -> Project:
        """Create a new project and set creator as Scrum Master"""
        # Validate dates
        if project_create.start_date and project_create.end_date and project_create.start_date >= project_create.end_date:
            raise ValueError("End date must be after start date")
        
        # Create project object
        db_project = Project(
            name=project_create.name,
            description=project_create.description,
            status=project_create.status,
            start_date=project_create.start_date,
            end_date=project_create.end_date,
            color=project_create.color,
            last_activity_at=datetime.now()
        )
        
        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        # Add creator as Scrum Master
        user_project_crud.add_user_to_project(
            db=db,
            user_id=creator_id,
            project_id=db_project.id,
            role=ScrumRole.SCRUM_MASTER
        )
        
        return db_project

    def get_project_with_user_role(
        self,
        db: Session,
        project_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """Get project with user's role information"""
        project = self.get_by_id(db, project_id)
        if not project:
            return None
            
        role = user_project_crud.get_user_role(db, user_id, project_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this project"
            )
            
        # Get project members count
        members_count = len(project.user_projects)
        
        # Count backlog items (user stories) for progress calculation
        backlog_total = 0
        backlog_completed = 0
        
        for sprint in project.sprints:
            for backlog_item in sprint.backlog_items:
                backlog_total += 1
                if backlog_item.status.value == "done":
                    backlog_completed += 1
        
        # Calculate progress based on completed backlog items
        if backlog_total > 0:
            progress = int((backlog_completed / backlog_total * 100))
        else:
            progress = 0
            
        return {
            "project": project,
            "user_role": role,
            "members_count": members_count,
            "backlog_completed": backlog_completed,
            "backlog_total": backlog_total,
            "progress": progress
        }

# Create CRUD instance
project_crud = ProjectCRUD(Project)