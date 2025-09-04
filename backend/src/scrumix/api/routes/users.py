"""
User management related API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime


from scrumix.api.core.security import get_current_user, get_current_superuser
from scrumix.api.db.session import get_db
from scrumix.api.crud.user import user_crud, session_crud
from scrumix.api.schemas.user import (
    UserResponse, UserUpdate, UserSessionResponse, ProfileUpdate, ProfileResponse, ChangePasswordRequest
)

router = APIRouter()

@router.get("/me/profile", response_model=ProfileResponse)
async def get_current_user_detailed_profile(current_user = Depends(get_current_user)):
    """Get current user detailed profile with all fields"""
    return current_user

@router.put("/me/profile", response_model=ProfileResponse)
async def update_current_user_profile(
    profile_update: ProfileUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    try:
        
        # Check if this is a virtual user (Keycloak user)
        if hasattr(current_user, '__class__') and current_user.__class__.__name__ == 'VirtualUser':
            # For Keycloak users, we can't update the database
            # Return the current user with updated fields for immediate UI feedback
            # Note: In a real implementation, you might want to store Keycloak user profiles separately
            # or integrate with Keycloak Admin API to update the profile there
            
            # Update the virtual user object with the new profile data
            user_update_data = profile_update.model_dump(exclude_unset=True)
            for field, value in user_update_data.items():
                if hasattr(current_user, field):
                    setattr(current_user, field, value)
            
            # Update the updated_at timestamp
            current_user.updated_at = datetime.now()
            
            return current_user
        else:
            # For local users, update in database as usual
            # Convert ProfileUpdate to UserUpdate for compatibility
            user_update_data = profile_update.model_dump(exclude_unset=True)
            user_update = UserUpdate(**user_update_data)
            
            updated_user = user_crud.update_user(db, current_user.id, user_update)
            if not updated_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user_basic_profile(
    user_update: UserUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user basic profile"""
    try:
        updated_user = user_crud.update_user(db, current_user.id, user_update)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/me/change-password")
async def change_user_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        success = user_crud.change_password(
            db, 
            current_user.id, 
            password_data.current_password, 
            password_data.new_password
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        return {"message": "Password changed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.get("/me/sessions", response_model=List[UserSessionResponse])
async def get_current_user_sessions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sessions for current user"""
    sessions = session_crud.get_user_sessions(db, current_user.id)
    return sessions

@router.delete("/me/sessions/{session_id}")
async def revoke_user_session(
    session_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke specified session"""
    success = session_crud.deactivate_session(db, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return {"message": "Session revoked successfully"}

@router.delete("/me/sessions")
async def revoke_all_user_sessions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all sessions for current user"""
    count = session_crud.deactivate_user_sessions(db, current_user.id)
    return {"message": f"Revoked {count} sessions"}

# Admin related routes
@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Get user list (admin)"""
    users = user_crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Get user by ID (admin)"""
    user = user_crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_by_id(
    user_id: int,
    user_update: UserUpdate,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Update user information (admin)"""
    try:
        updated_user = user_crud.update_user(db, user_id, user_update)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Deactivate user (admin)"""
    success = user_crud.deactivate_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Deactivate all user sessions
    session_crud.deactivate_user_sessions(db, user_id)
    
    return {"message": "User deactivated successfully"}

@router.post("/{user_id}/verify")
async def verify_user(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Verify user email (admin)"""
    success = user_crud.verify_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": "User verified successfully"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Delete user (admin)"""
    success = user_crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Delete all user sessions
    session_crud.deactivate_user_sessions(db, user_id)
    
    return {"message": "User deleted successfully"} 