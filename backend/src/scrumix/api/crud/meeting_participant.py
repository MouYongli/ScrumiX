"""
CRUD operations for MeetingParticipant
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .base import CRUDBase
from ..models.meeting_participant import MeetingParticipant, MeetingParticipantRole
from ..models.user import User
from ..models.meeting import Meeting
from ..schemas.meeting_participant import MeetingParticipantCreate, MeetingParticipantUpdate


class CRUDMeetingParticipant(CRUDBase[MeetingParticipant, MeetingParticipantCreate, MeetingParticipantUpdate]):
    """CRUD operations for MeetingParticipant."""
    
    def get_participants_by_meeting(
        self, 
        db: Session, 
        meeting_id: int
    ) -> List[dict]:
        """Get all participants for a meeting with user details and project roles."""
        from ..models.user_project import UserProject
        from ..models.meeting import Meeting
        
        # First get the meeting to know which project it belongs to
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return []
        
        project_id = meeting.project_id
        
        results = (
            db.query(
                User.id,
                User.username,
                User.email,
                User.full_name,
                MeetingParticipant.role.label("meeting_role"),
                MeetingParticipant.external_name,
                MeetingParticipant.external_email,
                MeetingParticipant.id.label("participant_id"),
                MeetingParticipant.created_at,
                UserProject.role.label("project_role")
            )
            .outerjoin(User, MeetingParticipant.user_id == User.id)
            .outerjoin(UserProject, and_(
                UserProject.user_id == User.id,
                UserProject.project_id == project_id
            ))
            .filter(MeetingParticipant.meeting_id == meeting_id)
            .all()
        )
        
        participants = []
        for user_id, username, email, full_name, meeting_role, external_name, external_email, participant_id, created_at, project_role in results:
            # For internal users, use project role if available, otherwise use meeting role
            # For external users, use meeting role (typically 'guest')
            final_role = project_role if project_role and user_id else meeting_role
            
            participants.append({
                "participant_id": participant_id,
                "user_id": user_id,
                "username": username,
                "email": email,
                "full_name": full_name,
                "role": final_role,
                "external_name": external_name,
                "external_email": external_email,
                "created_at": created_at
            })
        
        return participants

    def get_meetings_by_user(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Meeting]:
        """Get all meetings for a user."""
        return (
            db.query(Meeting)
            .join(MeetingParticipant)
            .filter(MeetingParticipant.user_id == user_id)
            .order_by(Meeting.start_datetime.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_participant_role(
        self,
        db: Session,
        user_id: int,
        meeting_id: int
    ) -> Optional[MeetingParticipantRole]:
        """Get user's role in a specific meeting."""
        participant = db.query(MeetingParticipant).filter(
            and_(
                MeetingParticipant.user_id == user_id,
                MeetingParticipant.meeting_id == meeting_id
            )
        ).first()
        return participant.role if participant else None

    def add_participant(
        self,
        db: Session,
        *,
        meeting_id: int,
        user_id: Optional[int] = None,
        external_name: Optional[str] = None,
        external_email: Optional[str] = None,
        role: MeetingParticipantRole = MeetingParticipantRole.GUEST
    ) -> MeetingParticipant:
        """Add a participant to a meeting."""
        # Validate that either user_id or external info is provided
        if not user_id and not (external_name or external_email):
            raise ValueError("Either user_id or external participant info must be provided")
        
        # Check if participant already exists
        if user_id:
            existing = db.query(MeetingParticipant).filter(
                and_(
                    MeetingParticipant.user_id == user_id,
                    MeetingParticipant.meeting_id == meeting_id
                )
            ).first()
            if existing:
                raise ValueError("User is already a participant in this meeting")

        participant = MeetingParticipant(
            user_id=user_id,
            meeting_id=meeting_id,
            role=role,
            external_name=external_name,
            external_email=external_email
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)
        return participant

    def remove_participant(
        self,
        db: Session,
        *,
        meeting_id: int,
        user_id: Optional[int] = None,
        participant_id: Optional[int] = None
    ) -> bool:
        """Remove a participant from a meeting."""
        if participant_id:
            # Remove by participant ID
            participant = db.query(MeetingParticipant).filter(
                and_(
                    MeetingParticipant.id == participant_id,
                    MeetingParticipant.meeting_id == meeting_id
                )
            ).first()
        elif user_id:
            # Remove by user ID
            participant = db.query(MeetingParticipant).filter(
                and_(
                    MeetingParticipant.user_id == user_id,
                    MeetingParticipant.meeting_id == meeting_id
                )
            ).first()
        else:
            raise ValueError("Either user_id or participant_id must be provided")

        if participant:
            db.delete(participant)
            db.commit()
            return True
        return False

    def update_participant_role(
        self,
        db: Session,
        *,
        meeting_id: int,
        user_id: Optional[int] = None,
        participant_id: Optional[int] = None,
        new_role: MeetingParticipantRole
    ) -> Optional[MeetingParticipant]:
        """Update participant's role in a meeting."""
        if participant_id:
            participant = db.query(MeetingParticipant).filter(
                and_(
                    MeetingParticipant.id == participant_id,
                    MeetingParticipant.meeting_id == meeting_id
                )
            ).first()
        elif user_id:
            participant = db.query(MeetingParticipant).filter(
                and_(
                    MeetingParticipant.user_id == user_id,
                    MeetingParticipant.meeting_id == meeting_id
                )
            ).first()
        else:
            raise ValueError("Either user_id or participant_id must be provided")

        if participant:
            participant.role = new_role
            db.commit()
            db.refresh(participant)
        return participant

    def add_multiple_participants(
        self,
        db: Session,
        *,
        meeting_id: int,
        participants: List[dict]
    ) -> List[MeetingParticipant]:
        """Add multiple participants to a meeting.
        
        Args:
            participants: List of dicts with keys: user_id, role, external_name, external_email
        """
        result = []
        try:
            for participant_data in participants:
                user_id = participant_data.get('user_id')
                role = participant_data.get('role', MeetingParticipantRole.GUEST)
                external_name = participant_data.get('external_name')
                external_email = participant_data.get('external_email')
                
                # Skip if participant already exists
                if user_id:
                    existing = db.query(MeetingParticipant).filter(
                        and_(
                            MeetingParticipant.user_id == user_id,
                            MeetingParticipant.meeting_id == meeting_id
                        )
                    ).first()
                    if existing:
                        continue

                participant = MeetingParticipant(
                    user_id=user_id,
                    meeting_id=meeting_id,
                    role=role,
                    external_name=external_name,
                    external_email=external_email
                )
                db.add(participant)
                result.append(participant)

            db.commit()
            for participant in result:
                db.refresh(participant)
            
            return result
        except Exception as e:
            db.rollback()
            raise e

    def remove_all_participants(
        self,
        db: Session,
        meeting_id: int
    ) -> int:
        """Remove all participants from a meeting."""
        deleted_count = db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_id
        ).delete()
        db.commit()
        return deleted_count

    def get_meeting_participants_count(
        self,
        db: Session,
        meeting_id: int
    ) -> int:
        """Get the number of participants in a meeting."""
        return db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_id
        ).count()

    def is_participant(
        self,
        db: Session,
        *,
        user_id: int,
        meeting_id: int
    ) -> bool:
        """Check if a user is a participant in a meeting."""
        participant = db.query(MeetingParticipant).filter(
            and_(
                MeetingParticipant.user_id == user_id,
                MeetingParticipant.meeting_id == meeting_id
            )
        ).first()
        return participant is not None

    def check_participant_access(
        self,
        db: Session,
        *,
        user_id: int,
        meeting_id: int,
        required_roles: Optional[List[MeetingParticipantRole]] = None
    ) -> bool:
        """Check if user has access to meeting with optional role requirements."""
        participant = db.query(MeetingParticipant).filter(
            and_(
                MeetingParticipant.user_id == user_id,
                MeetingParticipant.meeting_id == meeting_id
            )
        ).first()
        
        if not participant:
            return False
        
        if required_roles and participant.role not in required_roles:
            return False
        
        return True


# Create instance
meeting_participant_crud = CRUDMeetingParticipant(MeetingParticipant)
