from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date

from .base import CRUDBase
from ..models.personal_note import PersonalNote
from ..schemas.personal_note import PersonalNoteCreate, PersonalNoteUpdate


class CRUDPersonalNote(CRUDBase[PersonalNote, PersonalNoteCreate, PersonalNoteUpdate]):
    """CRUD operations for PersonalNote."""
    
    def create_with_user_and_project(
        self, 
        db: Session, 
        *, 
        obj_in: PersonalNoteCreate, 
        user_id: int, 
        project_id: int
    ) -> PersonalNote:
        """Create a new personal note with user and project IDs."""
        obj_in_data = obj_in.model_dump()
        obj_in_data["user_id"] = user_id
        obj_in_data["project_id"] = project_id
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_user_and_project(
        self, 
        db: Session, 
        user_id: int, 
        project_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[PersonalNote]:
        """Get personal notes by user and project."""
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.project_id == project_id
            )
        ).offset(skip).limit(limit).all()
    
    def get_by_date_range(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        start_date: date,
        end_date: date
    ) -> List[PersonalNote]:
        """Get personal notes by user, project, and date range."""
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.project_id == project_id,
                self.model.note_date >= start_date,
                self.model.note_date <= end_date
            )
        ).all()
    
    def get_by_user_project_and_date(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        note_date: date
    ) -> Optional[PersonalNote]:
        """Get a personal note by user, project, and specific date."""
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.project_id == project_id,
                self.model.note_date == note_date
            )
        ).first()
    
    def update_by_user_project_and_date(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        note_date: date,
        obj_in: PersonalNoteUpdate
    ) -> Optional[PersonalNote]:
        """Update a personal note by user, project, and date."""
        db_obj = self.get_by_user_project_and_date(db, user_id, project_id, note_date)
        if db_obj:
            return self.update(db, db_obj=db_obj, obj_in=obj_in)
        return None
    
    def delete_by_user_project_and_date(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        note_date: date
    ) -> Optional[PersonalNote]:
        """Delete a personal note by user, project, and date."""
        db_obj = self.get_by_user_project_and_date(db, user_id, project_id, note_date)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return db_obj
        return None


personal_note_crud = CRUDPersonalNote(PersonalNote)
