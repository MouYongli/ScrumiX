"""
User-related database models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from scrumix.api.db.base import Base

class AuthProvider(str, Enum):
    """Authentication provider enumeration"""
    LOCAL = "local"
    KEYCLOAK = "keycloak"
    GOOGLE = "google"
    GITHUB = "github"

class UserStatus(str, Enum):
    """User status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class User(Base):
    """User main table"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)  # Used for local login
    
    # User status and permissions
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    
    # Personal information
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    timezone = Column(String(100), default="UTC")
    language = Column(String(10), default="en")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    oauth_accounts = relationship("UserOAuth", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    user_projects = relationship("UserProject", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", secondary="user_project", back_populates="users", overlaps="user_projects")
    user_tasks = relationship("UserTask", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", secondary="user_task", back_populates="users", overlaps="user_tasks")
    meeting_participants = relationship("MeetingParticipant", back_populates="user", cascade="all, delete-orphan")
    meetings = relationship("Meeting", secondary="meeting_participant", back_populates="users", overlaps="meeting_participants") 
    user_documentations = relationship("UserDocumentation", back_populates="user", cascade="all, delete-orphan")
    documentations = relationship("Documentation", secondary="user_documentation", back_populates="users", overlaps="user_documentations")
    meeting_notes = relationship("MeetingNote", back_populates="user", cascade="all, delete-orphan")
    meeting_action_items = relationship("MeetingActionItem", back_populates="user", cascade="all, delete-orphan")
    
    # Notification relationships
    user_notifications = relationship("UserNotification", back_populates="user", cascade="all, delete-orphan")

class UserOAuth(Base):
    """OAuth account association table"""
    __tablename__ = "user_oauth"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # OAuth information
    provider = Column(SQLEnum(AuthProvider), nullable=False)
    provider_user_id = Column(String(255), nullable=False)  # OAuth provider's user ID
    provider_username = Column(String(255), nullable=True)
    
    # OAuth Token information (encrypted storage)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Other OAuth related information
    scope = Column(String(500), nullable=True)
    raw_data = Column(Text, nullable=True)  # Store original OAuth user information (JSON format)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="oauth_accounts")

class UserSession(Base):
    """User session table"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Session information
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token = Column(String(255), unique=True, nullable=True, index=True)
    
    # Client information
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    device_info = Column(Text, nullable=True)
    
    # Session status
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    deactivated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")