"""
Expanded tests for security functions - targeting 70%+ coverage
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt, JWTError
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from scrumix.api.core.security import (
    create_email_verification_token,
    verify_email_verification_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_current_user_hybrid,
    get_current_user_from_cookie,
    get_current_active_user,
    get_current_superuser,
    create_access_token,
    verify_token
)
from scrumix.api.core.config import settings
from scrumix.api.schemas.user import TokenData


class TestEmailVerificationTokens:
    """Test email verification token functions"""

    def test_create_email_verification_token(self):
        """Test creating email verification token"""
        email = "test@example.com"
        
        token = create_email_verification_token(email)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == email
        assert payload["type"] == "email_verification"
        assert "exp" in payload

    def test_verify_email_verification_token_valid(self):
        """Test verifying valid email verification token"""
        email = "verify@example.com"
        token = create_email_verification_token(email)
        
        result = verify_email_verification_token(token)
        
        assert result == email

    def test_verify_email_verification_token_invalid(self):
        """Test verifying invalid email verification token"""
        invalid_token = "invalid.token.here"
        
        result = verify_email_verification_token(invalid_token)
        
        assert result is None

    def test_verify_email_verification_token_wrong_type(self):
        """Test verifying token with wrong type"""
        email = "test@example.com"
        data = {"sub": email, "type": "wrong_type"}
        expire = datetime.now() + timedelta(hours=1)
        data.update({"exp": expire})
        wrong_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        result = verify_email_verification_token(wrong_token)
        
        assert result is None

    def test_verify_email_verification_token_no_email(self):
        """Test verifying token without email"""
        data = {"type": "email_verification"}
        expire = datetime.now() + timedelta(hours=1)
        data.update({"exp": expire})
        no_email_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        result = verify_email_verification_token(no_email_token)
        
        assert result is None

    def test_verify_email_verification_token_expired(self):
        """Test verifying expired email verification token"""
        email = "expired@example.com"
        data = {"sub": email, "type": "email_verification"}
        expire = int((datetime.now() - timedelta(hours=1)).timestamp())  # Expired timestamp
        data.update({"exp": expire})
        expired_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        result = verify_email_verification_token(expired_token)
        
        assert result is None


class TestPasswordResetTokens:
    """Test password reset token functions"""

    def test_create_password_reset_token(self):
        """Test creating password reset token"""
        email = "reset@example.com"
        
        token = create_password_reset_token(email)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == email
        assert payload["type"] == "password_reset"
        assert "exp" in payload

    def test_verify_password_reset_token_valid(self):
        """Test verifying valid password reset token"""
        email = "reset@example.com"
        token = create_password_reset_token(email)
        
        result = verify_password_reset_token(token)
        
        assert result == email

    def test_verify_password_reset_token_invalid(self):
        """Test verifying invalid password reset token"""
        invalid_token = "invalid.reset.token"
        
        result = verify_password_reset_token(invalid_token)
        
        assert result is None

    def test_verify_password_reset_token_wrong_type(self):
        """Test verifying token with wrong type"""
        email = "test@example.com"
        data = {"sub": email, "type": "email_verification"}  # Wrong type
        expire = datetime.now() + timedelta(hours=1)
        data.update({"exp": expire})
        wrong_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        result = verify_password_reset_token(wrong_token)
        
        assert result is None

    def test_verify_password_reset_token_no_email(self):
        """Test verifying token without email"""
        data = {"type": "password_reset"}
        expire = datetime.now() + timedelta(hours=1)
        data.update({"exp": expire})
        no_email_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        result = verify_password_reset_token(no_email_token)
        
        assert result is None

    def test_verify_password_reset_token_expired(self):
        """Test verifying expired password reset token"""
        email = "expired_reset@example.com"
        data = {"sub": email, "type": "password_reset"}
        expire = int((datetime.now() - timedelta(hours=1)).timestamp())  # Expired timestamp
        data.update({"exp": expire})
        expired_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        result = verify_password_reset_token(expired_token)
        
        assert result is None


class TestAuthenticationFunctions:
    """Test async authentication functions"""

    @pytest.mark.asyncio
    async def test_get_current_user_hybrid_with_header(self):
        """Test hybrid auth with Authorization header"""
        with patch('scrumix.api.core.security.verify_token') as mock_verify, \
             patch('scrumix.api.crud.user.user_crud') as mock_user_crud:
            
            # Setup mocks
            mock_verify.return_value = TokenData(user_id=1, email="test@example.com")
            mock_user = MagicMock()
            mock_user_crud.get_by_id.return_value = mock_user
            
            # Setup credentials and request
            credentials = MagicMock()
            credentials.credentials = "valid_token"
            request = MagicMock(spec=Request)
            request.headers = {"Authorization": "Bearer valid_token"}
            request.cookies = {}
            db = MagicMock(spec=Session)
            
            # Test the function
            result = await get_current_user_hybrid(request, credentials, db)
            
            assert result == mock_user
            mock_verify.assert_called_once_with("valid_token")
            mock_user_crud.get_by_id.assert_called_once_with(db, user_id=1)

    @pytest.mark.asyncio
    async def test_get_current_user_hybrid_with_cookie(self):
        """Test hybrid auth with cookie"""
        with patch('scrumix.api.core.security.get_access_token_from_cookie') as mock_cookie, \
             patch('scrumix.api.core.security.verify_token') as mock_verify, \
             patch('scrumix.api.crud.user.user_crud') as mock_user_crud:
            
            # Setup mocks
            mock_cookie.return_value = "valid_token"
            mock_verify.return_value = TokenData(user_id=1, email="test@example.com")
            mock_user = MagicMock()
            mock_user_crud.get_by_id.return_value = mock_user
            
            # Setup request and credentials
            request = MagicMock(spec=Request)
            request.headers = {}
            request.cookies = {"access_token": "valid_token"}
            db = MagicMock(spec=Session)
            
            # Mock credentials (None for cookie-based auth)
            credentials = None
            
            # Test the function
            result = await get_current_user_hybrid(request, credentials, db)
            
            # Verify the result
            assert result == mock_user
            mock_cookie.assert_called_once_with(request)
            mock_verify.assert_called_once_with("valid_token")
            mock_user_crud.get_by_id.assert_called_once_with(db, user_id=1)

    @pytest.mark.asyncio
    async def test_get_current_user_hybrid_no_token(self):
        """Test hybrid auth with no token"""
        with patch('scrumix.api.core.security.get_access_token_from_cookie') as mock_cookie:
            mock_cookie.return_value = None
            
            credentials = None
            request = MagicMock(spec=Request)
            db = MagicMock(spec=Session)
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_hybrid(credentials, request, db)
            
            assert exc_info.value.status_code == 401
            assert "Could not validate credentials" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_from_cookie_success(self):
        """Test getting user from cookie successfully"""
        with patch('scrumix.api.core.security.verify_token') as mock_verify, \
             patch('scrumix.api.crud.user.user_crud') as mock_user_crud, \
             patch('scrumix.api.core.security.get_access_token_from_cookie') as mock_cookie:
            
            # Setup mocks
            mock_verify.return_value = TokenData(user_id=3, email="cookie_user@example.com")
            mock_user = MagicMock()
            mock_user_crud.get_by_id.return_value = mock_user
            mock_cookie.return_value = "valid_cookie_token"
            
            request = MagicMock(spec=Request)
            db = MagicMock(spec=Session)
            
            result = await get_current_user_from_cookie(request, db)
            
            assert result == mock_user
            mock_cookie.assert_called_once_with(request)
            mock_verify.assert_called_once_with("valid_cookie_token")

    @pytest.mark.asyncio
    async def test_get_current_user_from_cookie_no_token(self):
        """Test getting user from cookie with no token"""
        with patch('scrumix.api.core.security.get_access_token_from_cookie') as mock_cookie:
            mock_cookie.return_value = None
            
            request = MagicMock(spec=Request)
            db = MagicMock(spec=Session)
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_from_cookie(request, db)
            
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_active_user_active(self):
        """Test getting current active user when user is active"""
        mock_user = MagicMock()
        mock_user.is_active = True
        
        result = await get_current_active_user(mock_user)
        
        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_current_active_user_inactive(self):
        """Test getting current active user when user is inactive"""
        mock_user = MagicMock()
        mock_user.is_active = False
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_active_user(mock_user)
        
        assert exc_info.value.status_code == 400
        assert "Inactive user" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_superuser_is_super(self):
        """Test getting current superuser when user is superuser"""
        mock_user = MagicMock()
        mock_user.is_superuser = True
        
        result = await get_current_superuser(mock_user)
        
        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_current_superuser_not_super(self):
        """Test getting current superuser when user is not superuser"""
        mock_user = MagicMock()
        mock_user.is_superuser = False
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_superuser(mock_user)
        
        assert exc_info.value.status_code == 400
        assert "The user doesn't have enough privileges" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_hybrid_jwt_error(self):
        """Test hybrid auth with JWT error"""
        with patch('scrumix.api.core.security.verify_token') as mock_verify:
            mock_verify.side_effect = JWTError("Invalid token")
            
            credentials = MagicMock()
            credentials.credentials = "invalid_token"
            request = MagicMock(spec=Request)
            db = MagicMock(spec=Session)
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_hybrid(credentials, request, db)
            
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio 
    async def test_get_current_user_hybrid_user_not_found(self):
        """Test hybrid auth when user not found"""
        with patch('scrumix.api.core.security.verify_token') as mock_verify, \
             patch('scrumix.api.crud.user.user_crud') as mock_user_crud:
            
            # Setup mocks
            mock_verify.return_value = TokenData(user_id=999, email="notfound@example.com")
            mock_user_crud.get_by_id.return_value = None
            
            # Setup request and credentials
            request = MagicMock(spec=Request)
            request.headers = {"Authorization": "Bearer valid_token"}
            request.cookies = {}
            db = MagicMock(spec=Session)
            
            # Mock credentials
            credentials = MagicMock()
            credentials.credentials = "valid_token"
            
            # Test the function
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_hybrid(request, credentials, db)
            
            # Verify the exception
            assert exc_info.value.status_code == 401
            assert "Could not validate credentials" in str(exc_info.value.detail)
            mock_verify.assert_called_once_with("valid_token")
            mock_user_crud.get_by_id.assert_called_once_with(db, user_id=999) 