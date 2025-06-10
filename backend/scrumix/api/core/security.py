# 安全相关，如认证加密
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from scrumix.api.core.config import settings
from scrumix.api.db.database import get_db
from scrumix.api.utils.password import verify_password, get_password_hash
from scrumix.api.schemas.user import TokenData

# JWT Bearer认证
security = HTTPBearer()

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
        user_id: int = payload.get("sub")
        email: str = payload.get("email")
        scopes: list = payload.get("scopes", [])
        
        if user_id is None:
            return None
            
        token_data = TokenData(user_id=user_id, email=email, scopes=scopes)
        return token_data
    except JWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """获取当前用户"""
    from scrumix.api.crud.user import user_crud
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token_data = verify_token(credentials.credentials)
        if token_data is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = user_crud.get_by_id(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

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