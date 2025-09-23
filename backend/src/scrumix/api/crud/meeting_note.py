from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from .base import CRUDBase
from ..models.meeting_note import MeetingNote
from ..schemas.meeting_note import MeetingNoteCreate, MeetingNoteUpdate


class CRUDMeetingNote(CRUDBase[MeetingNote, MeetingNoteCreate, MeetingNoteUpdate]):
    """CRUD operations for MeetingNote."""
    
    def get(self, db: Session, id: int) -> Optional[MeetingNote]:
        """Get a single meeting note with user information."""
        return db.query(self.model).options(joinedload(self.model.user)).filter(self.model.id == id).first()
    
    def get_multi_with_pagination(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        meeting_id: Optional[int] = None,
        search: Optional[str] = None,
        parent_only: bool = False
    ) -> tuple[List[MeetingNote], int]:
        """Get multiple meeting notes with pagination and optional filtering."""
        query = db.query(self.model)
        
        # Apply meeting filter
        if meeting_id:
            query = query.filter(self.model.meeting_id == meeting_id)
        
        # Apply parent-only filter (top-level notes only)
        if parent_only:
            query = query.filter(self.model.parent_note_id.is_(None))
        
        # Apply search filter
        if search:
            search_filter = self.model.content.ilike(f"%{search}%")
            query = query.filter(search_filter)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        notes = query.order_by(self.model.id.asc()).offset(skip).limit(limit).all()
        
        return notes, total
    
    def get_by_meeting_id(
        self,
        db: Session,
        *,
        meeting_id: int,
        skip: int = 0,
        limit: int = 100,
        include_children: bool = True
    ) -> List[MeetingNote]:
        """Get notes by meeting ID."""
        query = db.query(self.model).options(joinedload(self.model.user)).filter(self.model.meeting_id == meeting_id)
        
        if not include_children:
            # Only top-level notes
            query = query.filter(self.model.parent_note_id.is_(None))
        
        return (
            query
            .order_by(self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_top_level_notes_by_meeting(
        self,
        db: Session,
        *,
        meeting_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingNote]:
        """Get only top-level notes (no parent) for a meeting."""
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.meeting_id == meeting_id,
                    self.model.parent_note_id.is_(None)
                )
            )
            .order_by(self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_child_notes(
        self,
        db: Session,
        *,
        parent_note_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingNote]:
        """Get child notes for a specific parent note."""
        return (
            db.query(self.model)
            .filter(self.model.parent_note_id == parent_note_id)
            .order_by(self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_note_tree_by_meeting(
        self,
        db: Session,
        *,
        meeting_id: int
    ) -> List[MeetingNote]:
        """Get hierarchical note tree for a meeting."""
        # Get all notes for the meeting with user information
        all_notes = (
            db.query(self.model)
            .options(joinedload(self.model.user))
            .filter(self.model.meeting_id == meeting_id)
            .order_by(self.model.id.asc())
            .all()
        )
        
        # Build hierarchical structure
        note_dict = {note.id: note for note in all_notes}
        top_level_notes = []
        
        for note in all_notes:
            if note.parent_note_id is None:
                top_level_notes.append(note)
            else:
                # Add to parent's children
                parent = note_dict.get(note.parent_note_id)
                if parent:
                    if not hasattr(parent, '_children'):
                        parent._children = []
                    parent._children.append(note)
        
        return top_level_notes
    
    def count_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Count notes for a specific meeting."""
        return db.query(self.model).filter(self.model.meeting_id == meeting_id).count()
    
    def count_top_level_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Count top-level notes for a specific meeting."""
        return (
            db.query(self.model)
            .filter(
                and_(
                    self.model.meeting_id == meeting_id,
                    self.model.parent_note_id.is_(None)
                )
            )
            .count()
        )
    
    def search_notes(
        self,
        db: Session,
        *,
        query: str,
        meeting_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingNote]:
        """Search notes by content."""
        search_filter = self.model.content.ilike(f"%{query}%")
        
        db_query = db.query(self.model).filter(search_filter)
        
        # Optionally filter by meeting_id
        if meeting_id:
            db_query = db_query.filter(self.model.meeting_id == meeting_id)
        
        return (
            db_query
            .order_by(self.model.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def create_reply(
        self,
        db: Session,
        *,
        parent_note_id: int,
        content: str,
        meeting_id: int
    ) -> MeetingNote:
        """Create a reply to an existing note."""
        # Verify parent note exists and belongs to the same meeting
        parent_note = self.get(db=db, id=parent_note_id)
        if not parent_note:
            raise ValueError(f"Parent note with ID {parent_note_id} not found")
        
        if parent_note.meeting_id != meeting_id:
            raise ValueError("Parent note must belong to the same meeting")
        
        note_create = MeetingNoteCreate(
            meeting_id=meeting_id,
            content=content,
            parent_note_id=parent_note_id
        )
        return self.create(db=db, obj_in=note_create)
    
    def delete_all_by_meeting_id(self, db: Session, *, meeting_id: int) -> int:
        """Delete all notes for a specific meeting."""
        count = db.query(self.model).filter(self.model.meeting_id == meeting_id).count()
        db.query(self.model).filter(self.model.meeting_id == meeting_id).delete()
        db.commit()
        return count
    
    def get_meeting_notes_tree_by_meeting(
        self,
        db: Session,
        meeting_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingNote]:
        """Get meeting notes organized as tree structure by meeting ID."""
        # Get root notes (no parent)
        root_notes = (
            db.query(self.model)
            .filter(
                and_(
                    self.model.meeting_id == meeting_id,
                    self.model.parent_note_id.is_(None)
                )
            )
            .order_by(self.model.created_at.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return root_notes
    
    def get_note_children(
        self,
        db: Session,
        note_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingNote]:
        """Get children of a specific note."""
        return (
            db.query(self.model)
            .filter(self.model.parent_note_id == note_id)
            .order_by(self.model.created_at.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_note_thread(
        self,
        db: Session,
        note_id: int
    ) -> List[MeetingNote]:
        """Get the full thread of a note (all parents and children)."""
        note = self.get(db, note_id)
        if not note:
            return []
        
        # Find the root note
        root_note = note
        while root_note.parent_note_id:
            root_note = self.get(db, root_note.parent_note_id)
            if not root_note:
                break
        
        # Get all notes in this thread
        def get_descendants(note_obj):
            children = self.get_note_children(db, note_obj.id)
            result = [note_obj]
            for child in children:
                result.extend(get_descendants(child))
            return result
        
        return get_descendants(root_note) if root_note else []


# Create instance
meeting_note = CRUDMeetingNote(MeetingNote)
meeting_note_crud = CRUDMeetingNote(MeetingNote) 