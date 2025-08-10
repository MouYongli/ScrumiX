"""
Authentication-related API routes
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

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """User registration"""
    if not user_create.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for local registration"
        )
    
    try:
        user = user_crud.create_user(db, user_create)
        
        # Send email verification (email service needs to be implemented here)
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
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id), 
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "provider": "local"
        }, 
        expires_delta=access_token_expires
    )
    
    # Set access token as secure HTTP-only cookie
    set_access_token_cookie(
        response,
        access_token,
        expires_delta=access_token_expires
    )
    
    # Create refresh token (if remember me is selected)
    refresh_token = None
    if login_data.remember_me:
        refresh_token = create_refresh_token(
            data={
                "sub": str(user.id), 
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "provider": "local"
            }
        )
        # Set refresh token as secure HTTP-only cookie
        set_refresh_token_cookie(
            response,
            refresh_token,
            expires_delta=timedelta(days=7)
        )
    
    # Create session record
    session_expires = datetime.now() + access_token_expires
    if login_data.remember_me:
        session_expires = datetime.now() + timedelta(days=7)
    
    # Generate session token
    session_token = secrets.token_urlsafe(32)
    session = session_crud.create_session(
        db,
        user.id,
        session_token
    )
    
    # Update last login time
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
    """User logout - Enhanced with secure cookie clearing for all auth methods"""
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
    """Get Keycloak OAuth authorization URL"""
    # Backend callback redirect_uri
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/auth/oauth/keycloak/callback"
    # Generate base state token
    base_state = secrets.token_urlsafe(32)
    # Encode origin into state: {base_state}:{origin}
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
    """Handle Keycloak OAuth GET callback (Keycloak redirects here) - Simplified version, not stored in database"""
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    # Decode state to get origin information
    origin = "login"  # Default to login
    if state and ":" in state:
        try:
            base_state, origin = state.split(":", 1)
        except ValueError:
            # If parsing fails, use original state and default origin
            pass
    
    # Determine redirect page based on origin
    redirect_page = "/auth/signup" if origin == "signup" else "/auth/login"
    
    try:
        # Check for errors
        if error:
            error_msg = error_description or f"OAuth error: {error}"
            return RedirectResponse(
                url=f"{frontend_url}{redirect_page}?error={error_msg}",
                status_code=302
            )
        
        # Check required parameters
        if not code or not state:
            return RedirectResponse(
                url=f"{frontend_url}{redirect_page}?error=Missing authorization code or state",
                status_code=302
            )
        
        # Redirect directly to frontend, let frontend handle token exchange
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
    """Handle Keycloak OAuth callback - Enhanced with secure cookie support"""
    # Exchange authorization code for access token
    token_data = await keycloak_oauth.exchange_code_for_token(
        oauth_request.code, 
        oauth_request.redirect_uri
    )
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange code for token"
        )
    
    # Get user information
    user_info = await keycloak_oauth.get_user_info(token_data["access_token"])
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info from Keycloak"
        )
    
    # Build user data
    user_data = {
        "id": user_info["sub"],  # Use Keycloak's subject ID
        "email": user_info["email"],
        "full_name": user_info.get("name"),
        "username": user_info.get("preferred_username"),
        "avatar_url": user_info.get("picture"),
        "is_verified": True,
        "provider": "keycloak"
    }
    
    # Debug logging for Keycloak user data
    print(f" Keycloak user_info received: {user_info}")
    print(f" Mapped user_data: {user_data}")
    
    # Create internal JWT token for unified authentication architecture - Include full user data
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
    
    # Set secure HTTP-only cookies
    # 1. Internal access token cookie (for unified authentication)
    set_access_token_cookie(
        response,
        internal_access_token,
        expires_delta=access_token_expires
    )
    
    # 2. Keycloak access token cookie (for direct communication with Keycloak API)
    keycloak_expires = timedelta(seconds=token_data.get("expires_in", 3600))
    set_session_cookie(
        response,
        "keycloak_access_token",
        token_data["access_token"],
        expires_delta=keycloak_expires,
        httponly=True
    )
    
    # 3. Keycloak refresh token cookie (if available)
    if token_data.get("refresh_token"):
        set_session_cookie(
            response,
            "keycloak_refresh_token",
            token_data["refresh_token"],
            expires_delta=timedelta(days=30),  # Keycloak refresh tokens typically last longer
            httponly=True
        )
    
    # Return secure response - do not expose sensitive tokens in response body
    return {
        "access_token": internal_access_token,  # Our internal token (backward compatible)
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data,
        "provider": "keycloak",
        "auth_method": "cookie",  # Indicates using cookie authentication
        # Remove sensitive Keycloak tokens from response body
        # "keycloak_access_token": token_data["access_token"],  # Now in cookie
        # "keycloak_refresh_token": token_data.get("refresh_token"),  # Now in cookie
        "keycloak_expires_in": token_data.get("expires_in", 3600)
    }

@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refresh access token - Using refresh token from secure cookie"""
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
        data={
            "sub": str(user.id), 
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "provider": "local"
        },
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
    """Refresh Keycloak token - Using Keycloak refresh token from secure cookie"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Keycloak refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Get Keycloak refresh token from cookie
    keycloak_refresh_token = get_session_cookie(request, "keycloak_refresh_token")
    if not keycloak_refresh_token:
        raise credentials_exception
    
    try:
        # Use Keycloak refresh token to get new access token
        token_data = await keycloak_oauth.refresh_access_token(keycloak_refresh_token)
        if not token_data:
            raise credentials_exception
        
        # Get user information (verify new token validity)
        user_info = await keycloak_oauth.get_user_info(token_data["access_token"])
        if not user_info:
            raise credentials_exception
        
        # Build user data
        user_data = {
            "id": user_info["sub"],
            "email": user_info["email"],
            "full_name": user_info.get("name"),
            "username": user_info.get("preferred_username"),
            "avatar_url": user_info.get("picture"),
            "is_verified": True,
            "provider": "keycloak"
        }
        
        # Create new internal JWT token - Include full user data
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
        
        # Update secure cookies
        # 1. Update internal access token
        set_access_token_cookie(
            response,
            new_internal_token,
            expires_delta=access_token_expires
        )
        
        # 2. Update Keycloak access token
        keycloak_expires = timedelta(seconds=token_data.get("expires_in", 3600))
        set_session_cookie(
            response,
            "keycloak_access_token",
            token_data["access_token"],
            expires_delta=keycloak_expires,
            httponly=True
        )
        
        # 3. If new refresh token is obtained, also update it
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
    """Change password"""
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
    
    # Deactivate all sessions, force re-login
    session_crud.deactivate_user_sessions(db, current_user.id)
    
    return {"message": "Password changed successfully"}

@router.post("/password/reset/request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset"""
    user = user_crud.get_by_email(db, reset_request.email)
    if user:
        # Create reset token and send email
        reset_token = create_password_reset_token(user.email)
        # send_password_reset_email(user.email, reset_token)
    
    # Always return success regardless of whether user exists, avoid email enumeration attacks
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/password/reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Confirm password reset"""
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
    
    # Reset password
    user_crud.reset_password(db, user.id, reset_data.new_password)
    
    # Deactivate all sessions
    session_crud.deactivate_user_sessions(db, user.id)
    
    return {"message": "Password reset successfully"}

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information - Works with both header and cookie authentication"""
    return current_user

@router.get("/verify")
async def verify_authentication(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Verify user authentication status - Test endpoint for cookie authentication"""
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