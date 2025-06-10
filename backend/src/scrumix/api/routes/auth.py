"""
认证相关的API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Any
from datetime import datetime, timedelta
import secrets

from scrumix.api.core.security import (
    create_access_token, create_refresh_token, get_current_user,
    create_email_verification_token, verify_email_verification_token,
    create_password_reset_token, verify_password_reset_token
)
from scrumix.api.db.database import get_db
from scrumix.api.crud.user import user_crud, oauth_crud, session_crud
from scrumix.api.schemas.user import (
    UserCreate, UserResponse, LoginRequest, LoginResponse,
    OAuthTokenRequest, OAuthTokenResponse, PasswordResetRequest,
    PasswordResetConfirm, ChangePasswordRequest
)
from scrumix.api.models.user import AuthProvider
from scrumix.api.utils.oauth import keycloak_oauth
from scrumix.api.core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    if not user_create.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for local registration"
        )
    
    try:
        user = user_crud.create_user(db, user_create)
        
        # 发送邮箱验证邮件（这里需要实现邮件服务）
        # verification_token = create_email_verification_token(user.email)
        # send_verification_email(user.email, verification_token)
        
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """用户登录"""
    user = user_crud.authenticate(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}, 
        expires_delta=access_token_expires
    )
    
    # 创建刷新令牌（如果选择了记住我）
    refresh_token = None
    if login_data.remember_me:
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
    
    # 创建会话记录
    session_expires = datetime.now() + access_token_expires
    if login_data.remember_me:
        session_expires = datetime.now() + timedelta(days=7)
    
    session = session_crud.create_session(
        db,
        user.id,
        session_expires,
        user_agent=request.headers.get("User-Agent"),
        ip_address=request.client.host
    )
    
    # 更新最后登录时间
    user_crud.update_last_login(db, user.id)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user
    )

@router.post("/logout")
async def logout(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """用户登出"""
    # 停用用户的所有会话
    session_crud.deactivate_user_sessions(db, current_user.id)
    return {"message": "Successfully logged out"}

@router.get("/oauth/keycloak/authorize")
async def keycloak_authorize():
    """获取Keycloak OAuth授权URL"""
    # 后端callback的redirect_uri
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/oauth/keycloak/callback"
    state = secrets.token_urlsafe(32)
    authorization_url = keycloak_oauth.get_authorization_url(
        redirect_uri=redirect_uri,
        state=state
    )
    return {
        "authorization_url": authorization_url,
        "state": state
    }

@router.get("/oauth/keycloak/callback")
async def keycloak_callback_get(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
    db: Session = Depends(get_db)
):
    """处理Keycloak OAuth GET回调（Keycloak重定向到这里）"""
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    try:
        # 检查是否有错误
        if error:
            error_msg = error_description or f"OAuth error: {error}"
            return RedirectResponse(
                url=f"{frontend_url}/auth/login?error={error_msg}",
                status_code=302
            )
        
        # 检查必需的参数
        if not code:
            return RedirectResponse(
                url=f"{frontend_url}/auth/login?error=Missing authorization code",
                status_code=302
            )
        
        # 用授权码换取access token
        redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/oauth/keycloak/callback"
        token_data = await keycloak_oauth.exchange_code_for_token(code, redirect_uri)
        
        if not token_data:
            return RedirectResponse(
                url=f"{frontend_url}/auth/login?error=Failed to exchange code for token",
                status_code=302
            )
        
        # 获取用户信息
        user_info = await keycloak_oauth.get_user_info(token_data["access_token"])
        if not user_info:
            return RedirectResponse(
                url=f"{frontend_url}/auth/login?error=Failed to get user info",
                status_code=302
            )
        
        # 处理用户创建/更新逻辑 (与原POST callback相同)
        oauth_account = oauth_crud.get_by_provider_user_id(
            db, AuthProvider.KEYCLOAK, user_info["sub"]
        )
        
        is_new_user = False
        
        if oauth_account:
            oauth_crud.update_oauth_tokens(
                db,
                oauth_account.id,
                token_data["access_token"],
                token_data.get("refresh_token")
            )
            user = oauth_account.user
        else:
            user = user_crud.get_by_email(db, user_info["email"])
            
            if not user:
                user_create = UserCreate(
                    email=user_info["email"],
                    full_name=user_info.get("name"),
                    username=user_info.get("preferred_username"),
                    avatar_url=user_info.get("picture")
                )
                user = user_crud.create_user(db, user_create)
                user.is_verified = True
                db.commit()
                is_new_user = True
            
            oauth_crud.create_oauth_account(
                db,
                user.id,
                AuthProvider.KEYCLOAK,
                user_info["sub"],
                token_data["access_token"],
                token_data.get("refresh_token"),
                user_info
            )
        
        # 创建应用的JWT令牌
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        # 创建会话记录
        session_expires = datetime.now() + timedelta(days=7)
        session = session_crud.create_session(
            db,
            user.id,
            session_expires,
            user_agent=request.headers.get("User-Agent"),
            ip_address=request.client.host
        )
        
        # 更新最后登录时间
        user_crud.update_last_login(db, user.id)
        
        # 创建临时授权码用于前端获取token（更安全）
        temp_code = secrets.token_urlsafe(32)
        
        # 将token信息临时存储（可以用Redis，这里简单用内存）
        # 在生产环境中应该使用Redis或数据库
        temp_tokens = getattr(settings, '_temp_tokens', {})
        temp_tokens[temp_code] = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'is_new_user': is_new_user,
            'expires_at': datetime.now() + timedelta(minutes=5)  # 5分钟过期
        }
        settings._temp_tokens = temp_tokens
        
        # 重定向到前端，携带临时授权码
        redirect_url = f"{frontend_url}/auth/oauth/success?code={temp_code}"
        print(f"🚀 OAuth Success! Redirecting to: {redirect_url}")
        print(f"📝 Temp code: {temp_code}")
        return RedirectResponse(url=redirect_url, status_code=302)
        
    except Exception as e:
        print(f"OAuth callback error: {str(e)}")
        return RedirectResponse(
            url=f"{frontend_url}/auth/login?error=Authentication failed: {str(e)}",
            status_code=302
        )

@router.post("/oauth/exchange-temp-code")
async def exchange_temp_code(request: dict):
    """用临时授权码换取token"""
    temp_code = request.get('code')
    if not temp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing temporary code"
        )
    
    # 获取临时存储的token信息
    temp_tokens = getattr(settings, '_temp_tokens', {})
    token_info = temp_tokens.get(temp_code)
    
    if not token_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired temporary code"
        )
    
    # 检查是否过期
    if datetime.now() > token_info['expires_at']:
        # 清除过期的token
        del temp_tokens[temp_code]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Temporary code has expired"
        )
    
    # 返回token信息并清除临时存储
    result = {
        'access_token': token_info['access_token'],
        'refresh_token': token_info['refresh_token'],
        'token_type': 'bearer',
        'expires_in': settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        'is_new_user': token_info['is_new_user']
    }
    
    # 清除临时存储
    del temp_tokens[temp_code]
    
    return result

@router.post("/oauth/keycloak/callback", response_model=OAuthTokenResponse)
async def keycloak_callback(
    oauth_request: OAuthTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """处理Keycloak OAuth回调"""
    # 用授权码换取access token
    token_data = await keycloak_oauth.exchange_code_for_token(
        oauth_request.code, 
        oauth_request.redirect_uri
    )
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange code for token"
        )
    
    # 获取用户信息
    user_info = await keycloak_oauth.get_user_info(token_data["access_token"])
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info from Keycloak"
        )
    
    # 检查是否已有OAuth账户关联
    oauth_account = oauth_crud.get_by_provider_user_id(
        db, AuthProvider.KEYCLOAK, user_info["sub"]
    )
    
    is_new_user = False
    
    if oauth_account:
        # 已存在OAuth账户，更新token
        oauth_crud.update_oauth_tokens(
            db,
            oauth_account.id,
            token_data["access_token"],
            token_data.get("refresh_token")
        )
        user = oauth_account.user
    else:
        # 检查是否已有相同邮箱的用户
        user = user_crud.get_by_email(db, user_info["email"])
        
        if not user:
            # 创建新用户
            user_create = UserCreate(
                email=user_info["email"],
                full_name=user_info.get("name"),
                username=user_info.get("preferred_username"),
                avatar_url=user_info.get("picture")
            )
            user = user_crud.create_user(db, user_create)
            user.is_verified = True  # OAuth用户默认已验证
            db.commit()
            is_new_user = True
        
        # 创建OAuth账户关联
        oauth_crud.create_oauth_account(
            db,
            user.id,
            AuthProvider.KEYCLOAK,
            user_info["sub"],
            token_data["access_token"],
            token_data.get("refresh_token"),
            user_info
        )
    
    # 创建应用的访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    # 创建会话记录
    session_expires = datetime.now() + timedelta(days=7)
    session = session_crud.create_session(
        db,
        user.id,
        session_expires,
        user_agent=request.headers.get("User-Agent"),
        ip_address=request.client.host
    )
    
    # 更新最后登录时间
    user_crud.update_last_login(db, user.id)
    
    return OAuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user,
        is_new_user=is_new_user
    )

@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """刷新访问令牌"""
    session = session_crud.get_by_refresh_token(db, refresh_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = session.user
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # 创建新的访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    # 更新会话活动时间
    session_crud.update_activity(db, session.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/password/change")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """修改密码"""
    success = user_crud.change_password(
        db,
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid current password"
        )
    
    # 停用所有会话，强制重新登录
    session_crud.deactivate_user_sessions(db, current_user.id)
    
    return {"message": "Password changed successfully"}

@router.post("/password/reset/request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """请求密码重置"""
    user = user_crud.get_by_email(db, reset_request.email)
    if user:
        # 创建重置令牌并发送邮件
        reset_token = create_password_reset_token(user.email)
        # send_password_reset_email(user.email, reset_token)
    
    # 无论用户是否存在都返回成功，避免邮箱枚举攻击
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/password/reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """确认密码重置"""
    email = verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    user = user_crud.get_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 重置密码
    user_crud.reset_password(db, user.id, reset_data.new_password)
    
    # 停用所有会话
    session_crud.deactivate_user_sessions(db, user.id)
    
    return {"message": "Password reset successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user 