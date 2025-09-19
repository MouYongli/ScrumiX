"""
Secure cookie utilities for session management
"""
from typing import Optional
from fastapi import Response, Request
from datetime import datetime, timedelta, timezone

from scrumix.api.core.config import settings


def set_session_cookie(
    response: Response,
    key: str,
    value: str,
    expires_delta: Optional[timedelta] = None,
    httponly: bool = True
) -> None:
    """Set a session cookie with environment-appropriate security settings.
    
    Args:
        response: FastAPI Response object
        key: Cookie name
        value: Cookie value
        expires_delta: Cookie expiration time
        httponly: Whether cookie should be HTTP-only (recommended for security)
    """
    max_age = None
    if expires_delta:
        max_age = int(expires_delta.total_seconds())
    
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        expires=datetime.now(timezone.utc) + expires_delta if expires_delta else None,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        secure=settings.SECURE_COOKIES,  # False in dev, True in prod
        httponly=httponly,
        samesite=settings.COOKIE_SAMESITE  # "lax" in dev, "strict" in prod
    )


def get_session_cookie(request: Request, key: str) -> Optional[str]:
    """Get session cookie value from request.
    
    Args:
        request: FastAPI Request object
        key: Cookie name
        
    Returns:
        Cookie value if exists, None otherwise
    """
    return request.cookies.get(key)


def clear_session_cookie(response: Response, key: str) -> None:
    """Clear a session cookie by setting it to expire immediately.
    
    Args:
        response: FastAPI Response object
        key: Cookie name to clear
    """
    response.set_cookie(
        key=key,
        value="",
        max_age=0,
        expires=datetime.now(timezone.utc),
        path="/",
        domain=settings.COOKIE_DOMAIN,
        secure=settings.SECURE_COOKIES,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE
    )


def set_access_token_cookie(
    response: Response,
    token: str,
    expires_delta: Optional[timedelta] = None
) -> None:
    """Set access token as HTTP-only cookie.
    
    Args:
        response: FastAPI Response object
        token: JWT access token
        expires_delta: Token expiration time
    """
    set_session_cookie(
        response,
        settings.SESSION_COOKIE_NAME,
        token,
        expires_delta,
        httponly=True
    )


def set_refresh_token_cookie(
    response: Response,
    token: str,
    expires_delta: Optional[timedelta] = None
) -> None:
    """Set refresh token as HTTP-only cookie.
    
    Args:
        response: FastAPI Response object
        token: JWT refresh token
        expires_delta: Token expiration time
    """
    set_session_cookie(
        response,
        settings.REFRESH_COOKIE_NAME,
        token,
        expires_delta,
        httponly=True
    )


def get_access_token_from_cookie(request: Request) -> Optional[str]:
    """Get access token from cookie.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Access token if exists, None otherwise
    """
    return get_session_cookie(request, settings.SESSION_COOKIE_NAME)


def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """Get refresh token from cookie.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Refresh token if exists, None otherwise
    """
    return get_session_cookie(request, settings.REFRESH_COOKIE_NAME)


def clear_auth_cookies(response: Response) -> None:
    """Clear all authentication cookies.
    
    Args:
        response: FastAPI Response object
    """
    clear_session_cookie(response, settings.SESSION_COOKIE_NAME)
    clear_session_cookie(response, settings.REFRESH_COOKIE_NAME) 


# Convenience functions for testing
def create_auth_cookie(token: str) -> str:
    """Create a simple auth cookie string for testing purposes.
    
    Args:
        token: Authentication token
        
    Returns:
        Cookie string representation
    """
    return f"auth_token={token}; Path=/; HttpOnly"


def parse_auth_cookie(request) -> Optional[str]:
    """Parse auth token from request cookies.
    
    Args:
        request: Request object with cookies attribute
        
    Returns:
        Auth token if found, None otherwise
    """
    if hasattr(request, 'cookies') and 'auth_token' in request.cookies:
        return request.cookies['auth_token']
    return None 