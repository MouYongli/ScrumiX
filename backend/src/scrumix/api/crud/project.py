"""
Project-related CRUD operations
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from scrumix.api.models.project import Project, ProjectStatus
from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate
from scrumix.api.crud.base import CRUDBase

class ProjectCRUD(CRUDBase[Project, ProjectCreate, ProjectUpdate]):
    def create_project(self, db: Session, project_create: ProjectCreate) -> Project:
        """Create a new project"""
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
        return db_project
    
    def get_by_id(self, db: Session, project_id: int) -> Optional[Project]:
        """Get project by ID"""
        return self.get(db, project_id)
    
    def get_by_name(self, db: Session, name: str) -> Optional[Project]:
        """Get project by name"""
        return db.query(Project).filter(Project.name == name).first()
    
    def get_projects(self, db: Session, skip: int = 0, limit: int = 100, 
                    status: Optional[ProjectStatus] = None) -> List[Project]:
        """Get list of projects"""
        query = db.query(Project)
        
        if status:
            query = query.filter(Project.status == status)
        
        return query.order_by(Project.last_activity_at.desc()).offset(skip).limit(limit).all()
    
    def search_projects(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Project]:
        """Search projects"""
        query = db.query(Project).filter(
            or_(
                Project.name.ilike(f"%{search_term}%"),
                Project.description.ilike(f"%{search_term}%")
            )
        )
        
        return query.order_by(Project.last_activity_at.desc()).offset(skip).limit(limit).all()
    
    def update_project(self, db: Session, project_id: int, project_update: ProjectUpdate) -> Optional[Project]:
        """Update project information"""
        project = self.get_by_id(db, project_id)
        if not project:
            return None
        
        update_data = project_update.model_dump(exclude_unset=True, by_alias=True)
        
        # Validate dates
        start_date = update_data.get("start_date", project.start_date)
        end_date = update_data.get("end_date", project.end_date)
        if start_date and end_date and start_date >= end_date:
            raise ValueError("End date must be after start date")
        
        # Check if project name is already in use
        if "name" in update_data and update_data["name"] != project.name:
            existing_project = self.get_by_name(db, update_data["name"])
            if existing_project and existing_project.id != project_id:
                raise ValueError("Project name already in use")
        
        for field, value in update_data.items():
            setattr(project, field, value)
        
        # Update last activity time
        project.last_activity_at = datetime.now()
        
        db.commit()
        db.refresh(project)
        return project
    
    def delete_project(self, db: Session, project_id: int) -> bool:
        """Delete project"""
        project = self.get_by_id(db, project_id)
        if not project:
            return False
        
        db.delete(project)
        db.commit()
        return True
    
    def update_last_activity(self, db: Session, project_id: int) -> None:
        """Update project last activity time"""
        project = self.get_by_id(db, project_id)
        if project:
            project.last_activity_at = datetime.now()
            db.commit()
    
    def get_projects_by_status(self, db: Session, status: ProjectStatus, 
                              skip: int = 0, limit: int = 100) -> List[Project]:
        """Get projects by status"""
        return db.query(Project).filter(Project.status == status)\
                 .order_by(Project.last_activity_at.desc())\
                 .offset(skip).limit(limit).all()
    
    def count_projects(self, db: Session, status: Optional[ProjectStatus] = None) -> int:
        """Count projects"""
        query = db.query(Project)
        if status:
            query = query.filter(Project.status == status)
        return query.count()

# Create CRUD instance
project_crud = ProjectCRUD(Project)

# Export functions for test compatibility
def get_projects(db: Session, skip: int = 0, limit: int = 100, **kwargs) -> List[Project]:
    """Get list of projects"""
    return project_crud.get_projects(db, skip=skip, limit=limit, **kwargs)

def get_project(db: Session, project_id: int) -> Optional[Project]:
    """Get project by ID"""
    return project_crud.get_by_id(db, project_id)

def create_project(db: Session, project_create: ProjectCreate) -> Project:
    """Create a new project"""
    return project_crud.create_project(db, project_create)

def update_project(db: Session, project_id: int, project_update: ProjectUpdate) -> Optional[Project]:
    """Update project"""
    return project_crud.update_project(db, project_id, project_update)

def delete_project(db: Session, project_id: int) -> bool:
    """Delete project"""
    return project_crud.delete_project(db, project_id) 