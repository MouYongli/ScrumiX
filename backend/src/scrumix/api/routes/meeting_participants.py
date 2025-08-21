"""
API routes for meeting participants
"""
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..core.security import get_current_user
from ..db.database import get_db
from ..crud.meeting_participant import meeting_participant_crud
from ..crud.meeting import meeting_crud
from ..schemas.meeting_participant import (
    MeetingParticipantResponse,
    MeetingParticipantWithUser,
    MeetingParticipantsResponse,
    AddParticipantRequest,
    UpdateParticipantRoleRequest,
    RemoveParticipantRequest,
    MeetingParticipantsRequest
)
from ..models.meeting_participant import MeetingParticipantRole
from ..models.user import User

router = APIRouter()


@router.get("/meeting/{meeting_id}/participants", response_model=MeetingParticipantsResponse)
async def get_meeting_participants(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all participants for a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    # Get participants
    participants_data = meeting_participant_crud.get_participants_by_meeting(db, meeting_id=meeting_id)
    
    # Convert to response format
    participants = []
    for p in participants_data:
        participant = MeetingParticipantWithUser(
            id=p["participant_id"],
            meeting_id=meeting_id,
            user_id=p["user_id"],
            role=p["role"],
            external_name=p["external_name"],
            external_email=p["external_email"],
            created_at=p["created_at"],
            updated_at=p["created_at"],  # Using created_at as placeholder
            username=p["username"],
            email=p["email"],
            full_name=p["full_name"]
        )
        participants.append(participant)
    
    return MeetingParticipantsResponse(
        meeting_id=meeting_id,
        participants=participants,
        total_count=len(participants)
    )


@router.post("/meeting/{meeting_id}/participants", response_model=MeetingParticipantResponse)
async def add_meeting_participant(
    meeting_id: int,
    participant_data: AddParticipantRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a participant to a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    # Validate participant data
    if not participant_data.validate_participant_data():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or external participant information must be provided"
        )
    
    try:
        participant = meeting_participant_crud.add_participant(
            db,
            meeting_id=meeting_id,
            user_id=participant_data.user_id,
            external_name=participant_data.external_name,
            external_email=participant_data.external_email,
            role=participant_data.role
        )
        return participant
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding participant: {str(e)}"
        )


@router.post("/meeting/{meeting_id}/participants/bulk", response_model=List[MeetingParticipantResponse])
async def add_multiple_participants(
    meeting_id: int,
    participants_request: MeetingParticipantsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add multiple participants to a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    try:
        participants = meeting_participant_crud.add_multiple_participants(
            db,
            meeting_id=meeting_id,
            participants=participants_request.participants
        )
        return participants
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding participants: {str(e)}"
        )


@router.put("/meeting/{meeting_id}/participants/{participant_id}/role", response_model=MeetingParticipantResponse)
async def update_participant_role(
    meeting_id: int,
    participant_id: int,
    role_update: UpdateParticipantRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a participant's role in a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    participant = meeting_participant_crud.update_participant_role(
        db,
        meeting_id=meeting_id,
        participant_id=participant_id,
        new_role=role_update.role
    )
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return participant


@router.delete("/meeting/{meeting_id}/participants/{participant_id}")
async def remove_meeting_participant(
    meeting_id: int,
    participant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a participant from a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    success = meeting_participant_crud.remove_participant(
        db,
        meeting_id=meeting_id,
        participant_id=participant_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return {"message": "Participant removed successfully"}


@router.delete("/meeting/{meeting_id}/participants/user/{user_id}")
async def remove_participant_by_user(
    meeting_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a participant from a meeting by user ID"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    success = meeting_participant_crud.remove_participant(
        db,
        meeting_id=meeting_id,
        user_id=user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    return {"message": "Participant removed successfully"}


@router.delete("/meeting/{meeting_id}/participants")
async def remove_all_participants(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove all participants from a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    deleted_count = meeting_participant_crud.remove_all_participants(db, meeting_id=meeting_id)
    
    return {"message": f"Removed {deleted_count} participants from meeting"}


@router.get("/meeting/{meeting_id}/participants/count")
async def get_participants_count(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the number of participants in a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    count = meeting_participant_crud.get_meeting_participants_count(db, meeting_id=meeting_id)
    
    return {"meeting_id": meeting_id, "participants_count": count}


@router.get("/meeting/{meeting_id}/participants/check/{user_id}")
async def check_user_participation(
    meeting_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user is a participant in a meeting"""
    # Verify meeting exists
    meeting = meeting_crud.get_by_id(db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    is_participant = meeting_participant_crud.is_participant(
        db,
        user_id=user_id,
        meeting_id=meeting_id
    )
    
    role = None
    if is_participant:
        role = meeting_participant_crud.get_participant_role(db, user_id=user_id, meeting_id=meeting_id)
    
    return {
        "user_id": user_id,
        "meeting_id": meeting_id,
        "is_participant": is_participant,
        "role": role.value if role else None
    }


@router.get("/user/{user_id}/meetings", response_model=List[dict])
async def get_user_meetings(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all meetings for a user"""
    meetings = meeting_participant_crud.get_meetings_by_user(
        db,
        user_id=user_id,
        skip=skip,
        limit=limit
    )
    
    return [
        {
            "id": meeting.id,
            "title": meeting.title,
            "meeting_type": meeting.meeting_type.value,
            "start_datetime": meeting.start_datetime,
            "duration": meeting.duration,
            "location": meeting.location,
            "project_id": meeting.project_id,
            "sprint_id": meeting.sprint_id
        }
        for meeting in meetings
    ]
