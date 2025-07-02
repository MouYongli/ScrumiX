# 安全相关，如认证加密
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from scrumix.api.core.config import settings
from scrumix.api.db.database import get_db
from scrumix.api.utils.password import verify_password, get_password_hash
from scrumix.api.utils.cookies import get_access_token_from_cookie, get_refresh_token_from_cookie
from scrumix.api.schemas.user import TokenData

# JWT Bearer认证
security = HTTPBearer(auto_error=False)  # Set auto_error=False to allow fallback to cookies

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建JWT访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建刷新令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(days=7)  # 7天过期
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str) -> Optional[TokenData]:
    """验证JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: Union[int, str] = payload.get("sub")
        email: str = payload.get("email")
        scopes: list = payload.get("scopes", [])
        
        if user_id is None:
            return None
        
        # Include additional fields for enhanced TokenData
        token_data = TokenData(user_id=user_id, email=email, scopes=scopes)
        
        # Add additional Keycloak fields to token_data for VirtualUser creation
        token_data.full_name = payload.get("full_name")
        token_data.username = payload.get("username") 
        token_data.avatar_url = payload.get("avatar_url")
        token_data.provider = payload.get("provider", "local")
        
        return token_data
    except JWTError:
        return None

async def get_current_user_hybrid(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user from either Authorization header or secure cookie.
    
    This function provides hybrid authentication - it first tries to get the token
    from the Authorization header, and if that fails, it tries to get it from cookies.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    
    # Try to get token from Authorization header first
    if credentials:
        token = credentials.credentials
    
    # If no header token, try to get from cookie
    if not token:
        token = get_access_token_from_cookie(request)
    
    if not token:
        raise credentials_exception
    
    try:
        token_data = verify_token(token)
        if token_data is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    from scrumix.api.crud.user import user_crud
    
    # Handle both local users (int IDs) and Keycloak users (string UUIDs)
    if isinstance(token_data.user_id, int):
        # Local user - lookup in database
        user = user_crud.get_by_id(db, user_id=token_data.user_id)
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return user
    else:
        # Keycloak user - create virtual user object from token data
        # For Keycloak users, we trust the token and create a virtual user
        from scrumix.api.models.user import UserStatus
        
        # Create a virtual user object that behaves like a database user
        class VirtualUser:
            def __init__(self, token_data: TokenData):
                self.id = token_data.user_id
                self.email = token_data.email
                # Use Keycloak data from token if available
                self.username = getattr(token_data, 'username', None) or (token_data.email.split('@')[0] if token_data.email else None)
                self.full_name = getattr(token_data, 'full_name', None)
                self.avatar_url = getattr(token_data, 'avatar_url', None)
                self.timezone = "UTC"
                self.language = "en"
                self.is_active = True
                self.is_verified = True
                self.is_superuser = False
                self.status = UserStatus.ACTIVE
                self.created_at = datetime.now()
                self.updated_at = datetime.now()
                self.last_login_at = None
                
        return VirtualUser(token_data)

async def get_current_user_from_cookie(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current user specifically from secure cookie (for cookie-only endpoints)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Only try to get token from cookie
    token = get_access_token_from_cookie(request)
    
    if not token:
        raise credentials_exception
    
    try:
        token_data = verify_token(token)
        if token_data is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    from scrumix.api.crud.user import user_crud
    
    # Handle both local users (int IDs) and Keycloak users (string UUIDs)
    if isinstance(token_data.user_id, int):
        # Local user - lookup in database
        user = user_crud.get_by_id(db, user_id=token_data.user_id)
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return user
    else:
        # Keycloak user - create virtual user object from token data
        # For Keycloak users, we trust the token and create a virtual user
        from scrumix.api.models.user import UserStatus
        
        # Create a virtual user object that behaves like a database user
        class VirtualUser:
            def __init__(self, token_data: TokenData):
                self.id = token_data.user_id
                self.email = token_data.email
                # Use Keycloak data from token if available
                self.username = getattr(token_data, 'username', None) or (token_data.email.split('@')[0] if token_data.email else None)
                self.full_name = getattr(token_data, 'full_name', None)
                self.avatar_url = getattr(token_data, 'avatar_url', None)
                self.timezone = "UTC"
                self.language = "en"
                self.is_active = True
                self.is_verified = True
                self.is_superuser = False
                self.status = UserStatus.ACTIVE
                self.created_at = datetime.now()
                self.updated_at = datetime.now()
                self.last_login_at = None
                
        return VirtualUser(token_data)

# Update the default get_current_user to use hybrid authentication
get_current_user = get_current_user_hybrid

async def get_current_active_user(current_user = Depends(get_current_user)):
    """获取当前活跃用户"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_superuser(current_user = Depends(get_current_user)):
    """获取当前超级用户"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user

def create_email_verification_token(email: str) -> str:
    """创建邮箱验证token"""
    data = {"sub": email, "type": "email_verification"}
    expire = datetime.now() + timedelta(hours=24)  # 24小时过期
    data.update({"exp": expire})
    return jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")

def verify_email_verification_token(token: str) -> Optional[str]:
    """验证邮箱验证token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "email_verification":
            return None
        return email
    except JWTError:
        return None

def create_password_reset_token(email: str) -> str:
    """创建密码重置token"""
    data = {"sub": email, "type": "password_reset"}
    expire = datetime.now() + timedelta(hours=1)  # 1小时过期
    data.update({"exp": expire})
    return jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")

def verify_password_reset_token(token: str) -> Optional[str]:
    """验证密码重置token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "password_reset":
            return None
        return email
    except JWTError:
        return None 