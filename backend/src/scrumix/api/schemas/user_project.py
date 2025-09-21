"""
User-Project relationship schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from scrumix.api.models.user_project import ScrumRole

class ProjectMemberResponse(BaseModel):
    """Project member response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: ScrumRole
    joined_at: datetime
    is_admin: bool = False  # Keep for backward compatibility
    is_owner: bool = False  # New field for project ownership

class UserProjectCreate(BaseModel):
    """Add user to project schema"""
    user_id: int
    role: ScrumRole = ScrumRole.DEVELOPER
    is_owner: bool = False

class UserProjectUpdate(BaseModel):
    """Update user role in project schema"""
    role: ScrumRole

class UserProjectResponse(BaseModel):
    """User-Project relationship response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    project_id: int
    role: ScrumRole
    is_owner: bool
    created_at: datetime
    updated_at: datetime

class OwnershipTransferRequest(BaseModel):
    """Transfer project ownership schema"""
    new_owner_id: int = Field(..., gt=0, description="ID of the user to transfer ownership to")

class RoleAssignmentRequest(BaseModel):
    """Assign Scrum role schema"""
    user_id: int
    role: ScrumRole
