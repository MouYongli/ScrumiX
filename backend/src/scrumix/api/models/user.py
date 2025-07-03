"""
用户相关的数据库模型
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base

class AuthProvider(str, Enum):
    """认证提供商枚举"""
    LOCAL = "local"
    KEYCLOAK = "keycloak"
    GOOGLE = "google"
    GITHUB = "github"

class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class User(Base):
    """用户主表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)  # 本地登录时使用
    
    # 用户状态和权限
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    
    # 个人信息
    avatar_url = Column(String(500), nullable=True)
    timezone = Column(String(100), default="UTC")
    language = Column(String(10), default="zh-CN")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # 关联关系
    oauth_accounts = relationship("UserOAuth", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    user_projects = relationship("UserProject", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", secondary="user_project", back_populates="users")
    user_tasks = relationship("UserTask", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", secondary="user_task", back_populates="users")
    user_meetings = relationship("UserMeeting", back_populates="user", cascade="all, delete-orphan")
    meetings = relationship("Meeting", secondary="user_meeting", back_populates="users")
    user_documentations = relationship("UserDocumentation", back_populates="user", cascade="all, delete-orphan")
    documentations = relationship("Documentation", secondary="user_documentation", back_populates="users")

class UserOAuth(Base):
    """OAuth账户关联表"""
    __tablename__ = "user_oauth"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    
    # OAuth信息
    provider = Column(SQLEnum(AuthProvider), nullable=False)
    provider_user_id = Column(String(255), nullable=False)  # OAuth提供商的用户ID
    provider_username = Column(String(255), nullable=True)
    
    # OAuth Token信息（加密存储）
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # 其他OAuth相关信息
    scope = Column(String(500), nullable=True)
    raw_data = Column(Text, nullable=True)  # 存储原始的OAuth用户信息（JSON格式）
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关联关系
    user = relationship("User", back_populates="oauth_accounts")
    
    # 复合唯一索引：一个用户在同一个OAuth提供商只能有一个账户
    __table_args__ = (
        {"schema": None},
    )

class UserSession(Base):
    """用户会话表"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 会话信息
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token = Column(String(255), unique=True, nullable=True, index=True)
    
    # 客户端信息
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)  # 支持IPv6
    device_info = Column(Text, nullable=True)
    
    # 会话状态
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联关系
    user = relationship("User", back_populates="sessions") 