"""
认证相关的API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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
from scrumix.api.utils.cookies import (
    set_access_token_cookie, set_refresh_token_cookie, 
    clear_auth_cookies, get_refresh_token_from_cookie,
    get_session_cookie, set_session_cookie, clear_session_cookie
)
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
    response: Response,
    db: Session = Depends(get_db)
):
    """User Login - Enhanced with secure cookie session management"""
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
    
    # Set access token as secure HTTP-only cookie
    set_access_token_cookie(
        response,
        access_token,
        expires_delta=access_token_expires
    )
    
    # 创建刷新令牌（如果选择了记住我）
    refresh_token = None
    if login_data.remember_me:
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
        # Set refresh token as secure HTTP-only cookie
        set_refresh_token_cookie(
            response,
            refresh_token,
            expires_delta=timedelta(days=7)
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
    response: Response,
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """用户登出 - Enhanced with secure cookie clearing for all auth methods"""
    # Clear all authentication cookies (both internal and Keycloak)
    clear_auth_cookies(response)
    
    # Clear Keycloak-specific cookies
    clear_session_cookie(response, "keycloak_access_token")
    clear_session_cookie(response, "keycloak_refresh_token")
    
    # If this is a Keycloak user, optionally revoke the Keycloak token
    try:
        keycloak_token = get_session_cookie(request, "keycloak_access_token")
        if keycloak_token:
            # Attempt to revoke the Keycloak token (best effort)
            await keycloak_oauth.revoke_token(keycloak_token, "access_token")
    except Exception as e:
        # Don't fail logout if Keycloak revocation fails
        print(f"Failed to revoke Keycloak token: {e}")
    
    # Deactivate current user sessions for local users
    # Note: Keycloak users don't have database sessions in current implementation
    try:
        if hasattr(current_user, 'id') and current_user.id:
            session_crud.deactivate_user_sessions(db, current_user.id)
    except Exception as e:
        # Don't fail logout if session deactivation fails
        print(f"Failed to deactivate sessions: {e}")
    
    return {"message": "Successfully logged out"}

@router.get("/oauth/keycloak/authorize")
async def keycloak_authorize(origin: str = "login"):
    """获取Keycloak OAuth授权URL"""
    # 后端callback的redirect_uri
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/oauth/keycloak/callback"
    # 生成基础状态令牌
    base_state = secrets.token_urlsafe(32)
    # 将origin编码到状态中：{base_state}:{origin}
    encoded_state = f"{base_state}:{origin}"
    
    authorization_url = keycloak_oauth.get_authorization_url(
        redirect_uri=redirect_uri,
        state=encoded_state
    )
    return {
        "authorization_url": authorization_url,
        "state": encoded_state
    }

@router.get("/oauth/keycloak/callback")
async def keycloak_callback_get(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None
):
    """处理Keycloak OAuth GET回调（Keycloak重定向到这里）- 简化版本，不存储到数据库"""
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    # 解码状态以获取origin信息
    origin = "login"  # 默认为login
    if state and ":" in state:
        try:
            base_state, origin = state.split(":", 1)
        except ValueError:
            # 如果解析失败，使用原始state和默认origin
            pass
    
    # 根据origin确定重定向页面
    redirect_page = "/auth/signup" if origin == "signup" else "/auth/login"
    
    try:
        # 检查是否有错误
        if error:
            error_msg = error_description or f"OAuth error: {error}"
            return RedirectResponse(
                url=f"{frontend_url}{redirect_page}?error={error_msg}",
                status_code=302
            )
        
        # 检查必需的参数
        if not code or not state:
            return RedirectResponse(
                url=f"{frontend_url}{redirect_page}?error=Missing authorization code or state",
                status_code=302
            )
        
        # 直接重定向到前端，让前端处理token交换
        return RedirectResponse(
            url=f"{frontend_url}{redirect_page}?code={code}&state={state}",
            status_code=302
        )
        
    except Exception as e:
        print(f"Keycloak callback error: {e}")
        return RedirectResponse(
            url=f"{frontend_url}{redirect_page}?error=Internal server error",
            status_code=302
        )

@router.post("/oauth/keycloak/callback")
async def keycloak_callback(
    oauth_request: OAuthTokenRequest,
    request: Request,
    response: Response
):
    """处理Keycloak OAuth回调 - Enhanced with secure cookie support"""
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
    
    # 构建用户数据
    user_data = {
        "id": user_info["sub"],  # 使用Keycloak的subject ID
        "email": user_info["email"],
        "full_name": user_info.get("name"),
        "username": user_info.get("preferred_username"),
        "avatar_url": user_info.get("picture"),
        "is_verified": True,
        "provider": "keycloak"
    }
    
    # Debug logging for Keycloak user data
    print(f"🔐 Keycloak user_info received: {user_info}")
    print(f"📝 Mapped user_data: {user_data}")
    
    # 创建内部JWT token用于统一认证架构 - Include full user data
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    internal_access_token = create_access_token(
        data={
            "sub": user_data["id"], 
            "email": user_data["email"], 
            "full_name": user_data["full_name"],
            "username": user_data["username"],
            "avatar_url": user_data["avatar_url"],
            "provider": "keycloak"
        }, 
        expires_delta=access_token_expires
    )
    
    # 设置安全的HTTP-only cookies
    # 1. 内部访问令牌cookie (用于统一认证)
    set_access_token_cookie(
        response,
        internal_access_token,
        expires_delta=access_token_expires
    )
    
    # 2. Keycloak访问令牌cookie (用于直接与Keycloak API通信)
    keycloak_expires = timedelta(seconds=token_data.get("expires_in", 3600))
    set_session_cookie(
        response,
        "keycloak_access_token",
        token_data["access_token"],
        expires_delta=keycloak_expires,
        httponly=True
    )
    
    # 3. Keycloak刷新令牌cookie (如果可用)
    if token_data.get("refresh_token"):
        set_session_cookie(
            response,
            "keycloak_refresh_token",
            token_data["refresh_token"],
            expires_delta=timedelta(days=30),  # Keycloak refresh tokens通常持续更长时间
            httponly=True
        )
    
    # 返回安全响应 - 不在响应体中暴露敏感tokens
    return {
        "access_token": internal_access_token,  # 我们的内部token (向后兼容)
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data,
        "provider": "keycloak",
        "auth_method": "cookie",  # 指示使用cookie认证
        # 移除敏感的Keycloak tokens从响应体
        # "keycloak_access_token": token_data["access_token"],  # 现在在cookie中
        # "keycloak_refresh_token": token_data.get("refresh_token"),  # 现在在cookie中
        "keycloak_expires_in": token_data.get("expires_in", 3600)
    }

@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """刷新访问令牌 - Using refresh token from secure cookie"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Get refresh token from cookie
    refresh_token = get_refresh_token_from_cookie(request)
    if not refresh_token:
        raise credentials_exception
    
    try:
        from scrumix.api.core.security import verify_token
        token_data = verify_token(refresh_token)
        if token_data is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    from scrumix.api.crud.user import user_crud
    user = user_crud.get_by_id(db, user_id=token_data.user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    # Set new access token cookie
    set_access_token_cookie(
        response,
        new_access_token,
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=new_access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user
    )

@router.post("/oauth/keycloak/refresh")
async def refresh_keycloak_token(
    request: Request,
    response: Response
):
    """刷新Keycloak令牌 - Using Keycloak refresh token from secure cookie"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Keycloak refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 从cookie获取Keycloak refresh token
    keycloak_refresh_token = get_session_cookie(request, "keycloak_refresh_token")
    if not keycloak_refresh_token:
        raise credentials_exception
    
    try:
        # 使用Keycloak refresh token获取新的access token
        token_data = await keycloak_oauth.refresh_access_token(keycloak_refresh_token)
        if not token_data:
            raise credentials_exception
        
        # 获取用户信息 (验证新token有效性)
        user_info = await keycloak_oauth.get_user_info(token_data["access_token"])
        if not user_info:
            raise credentials_exception
        
        # 构建用户数据
        user_data = {
            "id": user_info["sub"],
            "email": user_info["email"],
            "full_name": user_info.get("name"),
            "username": user_info.get("preferred_username"),
            "avatar_url": user_info.get("picture"),
            "is_verified": True,
            "provider": "keycloak"
        }
        
        # 创建新的内部JWT token - Include full user data
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_internal_token = create_access_token(
            data={
                "sub": user_data["id"], 
                "email": user_data["email"], 
                "full_name": user_data["full_name"],
                "username": user_data["username"],
                "avatar_url": user_data["avatar_url"],
                "provider": "keycloak"
            },
            expires_delta=access_token_expires
        )
        
        # 更新安全cookies
        # 1. 更新内部访问令牌
        set_access_token_cookie(
            response,
            new_internal_token,
            expires_delta=access_token_expires
        )
        
        # 2. 更新Keycloak访问令牌
        keycloak_expires = timedelta(seconds=token_data.get("expires_in", 3600))
        set_session_cookie(
            response,
            "keycloak_access_token",
            token_data["access_token"],
            expires_delta=keycloak_expires,
            httponly=True
        )
        
        # 3. 如果获得新的refresh token，也更新它
        if token_data.get("refresh_token"):
            set_session_cookie(
                response,
                "keycloak_refresh_token",
                token_data["refresh_token"],
                expires_delta=timedelta(days=30),
                httponly=True
            )
        
        return {
            "access_token": new_internal_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_data,
            "provider": "keycloak",
            "auth_method": "cookie"
        }
        
    except Exception as e:
        print(f"Keycloak refresh error: {e}")
        raise credentials_exception

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

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """获取当前用户信息 - Works with both header and cookie authentication"""
    return current_user

@router.get("/verify")
async def verify_authentication(
    request: Request,
    current_user = Depends(get_current_user)
):
    """验证用户认证状态 - Test endpoint for cookie authentication"""
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "provider": current_user.provider,
        "has_session_cookie": get_session_cookie(request, settings.SESSION_COOKIE_NAME) is not None,
        "has_refresh_cookie": get_session_cookie(request, settings.REFRESH_COOKIE_NAME) is not None,
        "cookie_settings": {
            "secure": settings.SECURE_COOKIES,
            "samesite": settings.COOKIE_SAMESITE,
            "domain": settings.COOKIE_DOMAIN,
            "environment": settings.ENVIRONMENT
        }
    } 