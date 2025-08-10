"""
User-related Pydantic schemas
"""
from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from scrumix.api.models.user import AuthProvider, UserStatus

class UserBase(BaseModel):
    """User basic information"""
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str = "UTC"
    language: str = "zh-CN"

class UserCreate(UserBase):
    """Create user"""
    password: Optional[str] = None  # Required for local registration, optional for OAuth registration

class UserUpdate(BaseModel):
    """Update user information"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None

class UserInDB(UserBase):
    """User information in database"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    is_verified: bool
    is_superuser: bool
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

class UserResponse(UserBase):
    """User information returned to frontend"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    isActive: bool = Field(alias="is_active")
    isVerified: bool = Field(alias="is_verified")
    status: UserStatus
    createdAt: datetime = Field(alias="created_at")
    lastLoginAt: Optional[datetime] = Field(alias="last_login_at", default=None)

class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str
    remember_me: bool = False

class LoginResponse(BaseModel):
    """Login response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    """Token data"""
    user_id: Optional[Union[int, str]] = None
    email: Optional[str] = None
    scopes: List[str] = []
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: Optional[str] = None

class OAuthTokenRequest(BaseModel):
    """OAuth Token request"""
    code: str
    state: Optional[str] = None
    redirect_uri: str

class OAuthTokenResponse(BaseModel):
    """OAuth Token response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    is_new_user: bool = False

class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    """Change password request"""
    current_password: str
    new_password: str

class UserSessionResponse(BaseModel):
    """User session response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_activity_at: datetime
    expires_at: datetime 