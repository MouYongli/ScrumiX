"""
User-Project relationship schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

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
    is_admin: bool = False

class UserProjectCreate(BaseModel):
    """Add user to project schema"""
    user_id: int
    role: ScrumRole = ScrumRole.DEVELOPER

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
    created_at: datetime
    updated_at: datetime
