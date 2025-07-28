"""
Tests for security functions (JWT tokens, authentication)
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt, JWTError
from unittest.mock import patch

from scrumix.api.core.security import (
    create_access_token,
    create_refresh_token, 
    verify_token,
    create_email_verification_token,
    verify_email_verification_token,
    create_password_reset_token,
    verify_password_reset_token
)
from scrumix.api.core.config import settings
from scrumix.api.schemas.user import TokenData


class TestJWTTokens:
    """Test JWT token creation and verification"""

    def test_create_access_token_default_expiry(self):
        """Test creating access token with default expiry"""
        data = {"sub": "123", "email": "test@example.com"}
        token = create_access_token(data)
        
        # Verify token is created
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token can be decoded
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == "123"
        assert payload["email"] == "test@example.com"
        assert "exp" in payload
        
        # Verify expiry is around default time (within 2 hours tolerance for timezone issues)
        expected_exp = datetime.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        actual_exp = datetime.fromtimestamp(payload["exp"])
        assert abs((actual_exp - expected_exp).total_seconds()) < 7200

    def test_create_access_token_custom_expiry(self):
        """Test creating access token with custom expiry"""
        data = {"sub": "456", "email": "user@example.com"}
        custom_expiry = timedelta(hours=2)
        token = create_access_token(data, expires_delta=custom_expiry)
        
        # Verify token content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == "456"
        assert payload["email"] == "user@example.com"
        
        # Verify custom expiry
        expected_exp = datetime.now() + custom_expiry
        actual_exp = datetime.fromtimestamp(payload["exp"])
        assert abs((actual_exp - expected_exp).total_seconds()) < 7200

    def test_create_refresh_token_default_expiry(self):
        """Test creating refresh token with default expiry"""
        data = {"sub": "789", "email": "refresh@example.com"}
        token = create_refresh_token(data)
        
        # Verify token content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == "789"
        assert payload["email"] == "refresh@example.com"
        assert payload["type"] == "refresh"
        
        # Verify default 7-day expiry
        expected_exp = datetime.now() + timedelta(days=7)
        actual_exp = datetime.fromtimestamp(payload["exp"])
        assert abs((actual_exp - expected_exp).total_seconds()) < 7200

    def test_create_refresh_token_custom_expiry(self):
        """Test creating refresh token with custom expiry"""
        data = {"sub": "101", "email": "custom@example.com"}
        custom_expiry = timedelta(days=14)
        token = create_refresh_token(data, expires_delta=custom_expiry)
        
        # Verify token content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["type"] == "refresh"
        
        # Verify custom expiry
        expected_exp = datetime.now() + custom_expiry
        actual_exp = datetime.fromtimestamp(payload["exp"])
        assert abs((actual_exp - expected_exp).total_seconds()) < 7200

    def test_verify_token_valid(self):
        """Test verifying valid token"""
        # Create token with additional fields
        data = {
            "sub": "user123",
            "email": "valid@example.com",
            "scopes": ["read", "write"],
            "full_name": "Test User",
            "username": "testuser",
            "avatar_url": "https://example.com/avatar.jpg",
            "provider": "keycloak"
        }
        token = create_access_token(data)
        
        # Verify token
        token_data = verify_token(token)
        
        assert token_data is not None
        assert token_data.user_id == "user123"
        assert token_data.email == "valid@example.com"
        assert token_data.scopes == ["read", "write"]
        assert token_data.full_name == "Test User"
        assert token_data.username == "testuser"
        assert token_data.avatar_url == "https://example.com/avatar.jpg"
        assert token_data.provider == "keycloak"

    def test_verify_token_minimal_data(self):
        """Test verifying token with minimal required data"""
        data = {"sub": "user456", "email": "minimal@example.com"}
        token = create_access_token(data)
        
        token_data = verify_token(token)
        
        assert token_data is not None
        assert token_data.user_id == "user456"
        assert token_data.email == "minimal@example.com"
        assert token_data.scopes == []  # Default empty list
        assert token_data.provider == "local"  # Default value

    def test_verify_token_invalid_signature(self):
        """Test verifying token with invalid signature"""
        data = {"sub": "user789", "email": "test@example.com"}
        token = create_access_token(data)
        
        # Tamper with token
        tampered_token = token[:-5] + "wrong"
        
        token_data = verify_token(tampered_token)
        assert token_data is None

    def test_verify_token_expired(self):
        """Test verifying expired token"""
        # Manually create expired token
        data = {
            "sub": "user999", 
            "email": "expired@example.com",
            "exp": int((datetime.now() - timedelta(hours=1)).timestamp())  # Expired 1 hour ago
        }
        expired_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        token_data = verify_token(expired_token)
        assert token_data is None

    def test_verify_token_missing_sub(self):
        """Test verifying token missing required 'sub' field"""
        # Manually create token without 'sub'
        data = {"email": "nosub@example.com"}
        token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        token_data = verify_token(token)
        assert token_data is None

    def test_verify_token_invalid_format(self):
        """Test verifying malformed token"""
        invalid_token = "not.a.jwt.token"
        
        token_data = verify_token(invalid_token)
        assert token_data is None


class TestEmailVerificationTokens:
    """Test email verification token functions"""

    def test_create_email_verification_token(self):
        """Test creating email verification token"""
        email = "verify@example.com"
        token = create_email_verification_token(email)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == email
        assert payload["type"] == "email_verification"
        assert "exp" in payload

    def test_verify_email_verification_token_valid(self):
        """Test verifying valid email verification token"""
        email = "valid@example.com"
        token = create_email_verification_token(email)
        
        verified_email = verify_email_verification_token(token)
        assert verified_email == email

    def test_verify_email_verification_token_invalid(self):
        """Test verifying invalid email verification token"""
        invalid_token = "invalid.token.here"
        
        verified_email = verify_email_verification_token(invalid_token)
        assert verified_email is None

    def test_verify_email_verification_token_wrong_type(self):
        """Test verifying token with wrong type"""
        # Create access token instead of email verification token
        data = {"sub": "123", "email": "wrong@example.com"}
        wrong_token = create_access_token(data)
        
        verified_email = verify_email_verification_token(wrong_token)
        assert verified_email is None


class TestPasswordResetTokens:
    """Test password reset token functions"""

    def test_create_password_reset_token(self):
        """Test creating password reset token"""
        email = "reset@example.com"
        token = create_password_reset_token(email)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token content
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == email
        assert payload["type"] == "password_reset"
        assert "exp" in payload

    def test_verify_password_reset_token_valid(self):
        """Test verifying valid password reset token"""
        email = "resetvalid@example.com"
        token = create_password_reset_token(email)
        
        verified_email = verify_password_reset_token(token)
        assert verified_email == email

    def test_verify_password_reset_token_invalid(self):
        """Test verifying invalid password reset token"""
        invalid_token = "invalid.reset.token"
        
        verified_email = verify_password_reset_token(invalid_token)
        assert verified_email is None

    def test_verify_password_reset_token_wrong_type(self):
        """Test verifying token with wrong type"""
        # Create email verification token instead of password reset token
        email = "wrongtype@example.com"
        wrong_token = create_email_verification_token(email)
        
        verified_email = verify_password_reset_token(wrong_token)
        assert verified_email is None

    def test_verify_password_reset_token_expired(self):
        """Test verifying expired password reset token"""
        email = "expired@example.com"
        
        # Manually create expired token
        data = {
            "email": email,
            "type": "password_reset",
            "exp": datetime.now() - timedelta(hours=1)  # Expired 1 hour ago
        }
        expired_token = jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")
        
        verified_email = verify_password_reset_token(expired_token)
        assert verified_email is None
