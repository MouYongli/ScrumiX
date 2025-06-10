"""
用户相关的Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from scrumix.api.models.user import AuthProvider, UserStatus

class UserBase(BaseModel):
    """用户基础信息"""
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str = "UTC"
    language: str = "zh-CN"

class UserCreate(UserBase):
    """创建用户"""
    password: Optional[str] = None  # 本地注册时必须，OAuth注册时可选

class UserUpdate(BaseModel):
    """更新用户信息"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None

class UserInDB(UserBase):
    """数据库中的用户信息"""
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
    """返回给前端的用户信息"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    is_verified: bool
    status: UserStatus
    created_at: datetime
    last_login_at: Optional[datetime] = None

class LoginRequest(BaseModel):
    """登录请求"""
    email: EmailStr
    password: str
    remember_me: bool = False

class LoginResponse(BaseModel):
    """登录响应"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    """Token数据"""
    user_id: Optional[int] = None
    email: Optional[str] = None
    scopes: List[str] = []

class OAuthTokenRequest(BaseModel):
    """OAuth Token请求"""
    code: str
    state: Optional[str] = None
    redirect_uri: str

class OAuthTokenResponse(BaseModel):
    """OAuth Token响应"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    is_new_user: bool = False

class PasswordResetRequest(BaseModel):
    """密码重置请求"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """密码重置确认"""
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    current_password: str
    new_password: str

class UserSessionResponse(BaseModel):
    """用户会话响应"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_activity_at: datetime
    expires_at: datetime 