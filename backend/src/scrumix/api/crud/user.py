"""
用户相关的CRUD操作
"""
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import secrets
import json

from scrumix.api.models.user import User, UserOAuth, UserSession, AuthProvider
from scrumix.api.schemas.user import UserCreate, UserUpdate
from scrumix.api.utils.password import get_password_hash, verify_password
from .base import CRUDBase

class UserCRUD(CRUDBase[User, UserCreate, UserUpdate]):
    def __init__(self):
        super().__init__(User)
    
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create a new user with proper validation"""
        # 检查邮箱是否已存在
        if self.get_by_email(db, obj_in.email):
            raise ValueError("邮箱已被注册")
        
        # 检查用户名是否已存在
        if obj_in.username and self.get_by_username(db, obj_in.username):
            raise ValueError("用户名已被使用")
        
        # 创建用户对象
        db_user = User(
            email=obj_in.email,
            username=obj_in.username,
            full_name=obj_in.full_name,
            avatar_url=obj_in.avatar_url,
            timezone=obj_in.timezone,
            language=obj_in.language,
            hashed_password=get_password_hash(obj_in.password) if obj_in.password else None,
            is_verified=False  # 需要邮箱验证
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def create_user(self, db: Session, user_create: UserCreate) -> User:
        """Create a new user (alias for create method)"""
        return self.create(db, obj_in=user_create)
    
    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """根据ID获取用户"""
        return self.get(db, user_id)
    
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """根据邮箱获取用户"""
        return db.query(User).filter(User.email == email).first()
    
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        return db.query(User).filter(User.username == username).first()
    
    def authenticate(self, db: Session, email: str, password: str) -> Optional[User]:
        """验证用户登录"""
        user = self.get_by_email(db, email)
        if not user:
            return None
        if not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    def update_user(self, db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        """更新用户信息"""
        user = self.get_by_id(db, user_id)
        if not user:
            return None
        
        update_data = user_update.model_dump(exclude_unset=True)
        
        # 检查用户名是否已被使用
        if "username" in update_data and update_data["username"]:
            existing_user = self.get_by_username(db, update_data["username"])
            if existing_user and existing_user.id != user_id:
                raise ValueError("用户名已被使用")
        
        # 检查邮箱是否已被使用
        if "email" in update_data:
            existing_user = self.get_by_email(db, update_data["email"])
            if existing_user and existing_user.id != user_id:
                raise ValueError("邮箱已被使用")
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        return user
    
    def update_last_login(self, db: Session, user_id: int) -> None:
        """更新最后登录时间"""
        user = self.get_by_id(db, user_id)
        if user:
            user.last_login_at = datetime.now()
            db.commit()
    
    def change_password(self, db: Session, user_id: int, current_password: str, new_password: str) -> bool:
        """修改密码"""
        user = self.get_by_id(db, user_id)
        if not user or not user.hashed_password:
            return False
        
        if not verify_password(current_password, user.hashed_password):
            return False
        
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True
    
    def reset_password(self, db: Session, user_id: int, new_password: str) -> bool:
        """重置密码（管理员操作或忘记密码）"""
        user = self.get_by_id(db, user_id)
        if not user:
            return False
        
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True
    
    def verify_user(self, db: Session, user_id: int) -> bool:
        """验证用户邮箱"""
        user = self.get_by_id(db, user_id)
        if not user:
            return False
        
        user.is_verified = True
        db.commit()
        return True
    
    def deactivate_user(self, db: Session, user_id: int) -> bool:
        """停用用户"""
        user = self.get_by_id(db, user_id)
        if not user:
            return False
        
        user.is_active = False
        db.commit()
        return True
    
    def get_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """获取用户列表"""
        return db.query(User).offset(skip).limit(limit).all()
    
    def is_active(self, user: User) -> bool:
        """Check if user is active"""
        return user.is_active
    
    def is_superuser(self, user: User) -> bool:
        """Check if user is superuser"""
        return user.is_superuser

class UserOAuthCRUD:
    def create_oauth_account(self, db: Session, user_id: int, provider: AuthProvider, 
                           provider_user_id: str, access_token: str, 
                           refresh_token: Optional[str] = None, 
                           raw_data: Optional[dict] = None) -> UserOAuth:
        """创建OAuth账户关联"""
        oauth_account = UserOAuth(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            raw_data=json.dumps(raw_data) if raw_data else None
        )
        
        db.add(oauth_account)
        db.commit()
        db.refresh(oauth_account)
        return oauth_account
    
    def get_by_provider_user_id(self, db: Session, provider: AuthProvider, provider_user_id: str) -> Optional[UserOAuth]:
        """根据OAuth提供商和用户ID获取账户"""
        return db.query(UserOAuth).filter(
            and_(
                UserOAuth.provider == provider,
                UserOAuth.provider_user_id == provider_user_id
            )
        ).first()
    
    def update_oauth_tokens(self, db: Session, oauth_id: int, access_token: str, 
                          refresh_token: Optional[str] = None, expires_at: Optional[datetime] = None) -> bool:
        """更新OAuth tokens"""
        oauth_account = db.query(UserOAuth).filter(UserOAuth.id == oauth_id).first()
        if not oauth_account:
            return False
        
        oauth_account.access_token = access_token
        if refresh_token:
            oauth_account.refresh_token = refresh_token
        if expires_at:
            oauth_account.token_expires_at = expires_at
        
        db.commit()
        return True

class UserSessionCRUD:
    def create_session(self, db: Session, user_id: int, expires_at: datetime,
                      user_agent: Optional[str] = None, ip_address: Optional[str] = None,
                      device_info: Optional[str] = None) -> UserSession:
        """创建用户会话"""
        session_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        
        session = UserSession(
            user_id=user_id,
            session_token=session_token,
            refresh_token=refresh_token,
            user_agent=user_agent,
            ip_address=ip_address,
            device_info=device_info,
            expires_at=expires_at
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    def get_by_session_token(self, db: Session, session_token: str) -> Optional[UserSession]:
        """根据会话token获取会话"""
        return db.query(UserSession).filter(
            and_(
                UserSession.session_token == session_token,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.now()
            )
        ).first()
    
    def get_by_refresh_token(self, db: Session, refresh_token: str) -> Optional[UserSession]:
        """根据刷新token获取会话"""
        return db.query(UserSession).filter(
            and_(
                UserSession.refresh_token == refresh_token,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.now()
            )
        ).first()
    
    def update_activity(self, db: Session, session_id: int) -> bool:
        """更新会话活动时间"""
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session:
            return False
        
        session.last_activity_at = datetime.now()
        db.commit()
        return True
    
    def deactivate_session(self, db: Session, session_id: int) -> bool:
        """停用会话"""
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session:
            return False
        
        session.is_active = False
        db.commit()
        return True
    
    def deactivate_user_sessions(self, db: Session, user_id: int) -> int:
        """停用用户的所有会话"""
        count = db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_active == True
            )
        ).update({"is_active": False})
        db.commit()
        return count
    
    def cleanup_expired_sessions(self, db: Session) -> int:
        """清理过期会话"""
        count = db.query(UserSession).filter(
            UserSession.expires_at < datetime.now()
        ).update({"is_active": False})
        db.commit()
        return count
    
    def get_user_sessions(self, db: Session, user_id: int) -> List[UserSession]:
        """获取用户的所有活跃会话"""
        return db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.now()
            )
        ).order_by(UserSession.last_activity_at.desc()).all()

# 实例化CRUD对象
user_crud = UserCRUD()
oauth_crud = UserOAuthCRUD()
session_crud = UserSessionCRUD() 