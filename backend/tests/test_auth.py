"""
Authentication API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timedelta

from scrumix.api.models.user import UserStatus, AuthProvider
from scrumix.api.schemas.user import UserCreate, LoginRequest


class TestAuthEndpoints:
    """Test authentication endpoints"""

    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "ok", "message": "ScrumiX API is running"}

    def test_register_success(self, client, db_session):
        """Test successful user registration"""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "newpassword123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["full_name"] == user_data["full_name"]
        assert "password" not in data
        assert data["is_active"] is True
        assert data["is_verified"] is False

    def test_register_duplicate_email(self, client, db_session, test_user):
        """Test registration with duplicate email"""
        user_data = {
            "email": test_user.email,
            "username": "differentuser",
            "full_name": "Different User",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"]

    def test_register_duplicate_username(self, client, db_session, test_user):
        """Test registration with duplicate username"""
        user_data = {
            "email": "different@example.com",
            "username": test_user.username,
            "full_name": "Different User",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already used" in response.json()["detail"]

    def test_register_invalid_email(self, client, db_session):
        """Test registration with invalid email"""
        user_data = {
            "email": "invalid-email",
            "username": "testuser",
            "full_name": "Test User",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_weak_password(self, client, db_session):
        """Test registration with weak password"""
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "password": "123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_success(self, client, db_session, test_user):
        """Test successful login"""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123",
            "remember_me": False
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["access_token"] is not None
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == test_user.email
        assert data["user"]["username"] == test_user.username

    def test_login_invalid_credentials(self, client, db_session, test_user):
        """Test login with invalid credentials"""
        login_data = {
            "email": test_user.email,
            "password": "wrongpassword",
            "remember_me": False
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user"""
        # Create inactive user
        from scrumix.api.models.user import User
        from scrumix.api.utils.password import get_password_hash
        
        inactive_user = User(
            email="inactive@example.com",
            username="inactive",
            full_name="Inactive User",
            hashed_password=get_password_hash("password123"),
            is_active=False
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        login_data = {
            "email": inactive_user.email,
            "password": "password123",
            "remember_me": False
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Inactive user" in response.json()["detail"]

    def test_login_nonexistent_user(self, client, db_session):
        """Test login with non-existent user"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123",
            "remember_me": False
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in response.json()["detail"]

    def test_logout_success(self, client, auth_headers):
        """Test successful logout"""
        response = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Successfully logged out"

    def test_logout_without_auth(self, client):
        """Test logout without authentication"""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('scrumix.api.routes.auth.keycloak_oauth')
    def test_oauth_login_success(self, mock_keycloak, client, db_session):
        """Test successful OAuth login"""
        # Mock OAuth response
        mock_keycloak.authenticate.return_value = {
            "access_token": "oauth_access_token",
            "refresh_token": "oauth_refresh_token",
            "user_info": {
                "sub": "oauth_user_id",
                "email": "oauth@example.com",
                "preferred_username": "oauthuser",
                "name": "OAuth User"
            }
        }
        
        oauth_data = {
            "code": "oauth_code",
            "state": "oauth_state"
        }
        
        response = client.post("/api/v1/auth/oauth/keycloak", json=oauth_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["access_token"] is not None
        assert data["token_type"] == "bearer"

    def test_refresh_token_success(self, client, db_session, test_user):
        """Test successful token refresh"""
        from scrumix.api.core.security import create_refresh_token
        
        refresh_token = create_refresh_token(data={"sub": str(test_user.id), "email": test_user.email})
        
        response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["access_token"] is not None
        assert data["token_type"] == "bearer"

    def test_refresh_token_invalid(self, client, db_session):
        """Test token refresh with invalid token"""
        response = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid_token"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_success(self, client, db_session, test_user, auth_headers):
        """Test successful password change"""
        password_data = {
            "current_password": "testpassword123",
            "new_password": "newpassword123"
        }
        
        response = client.post("/api/v1/auth/change-password", json=password_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Password changed successfully"

    def test_change_password_wrong_current(self, client, db_session, test_user, auth_headers):
        """Test password change with wrong current password"""
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        
        response = client.post("/api/v1/auth/change-password", json=password_data, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Current password is incorrect" in response.json()["detail"]

    def test_change_password_weak_new(self, client, db_session, test_user, auth_headers):
        """Test password change with weak new password"""
        password_data = {
            "current_password": "testpassword123",
            "new_password": "123"
        }
        
        response = client.post("/api/v1/auth/change-password", json=password_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_forgot_password_success(self, client, db_session, test_user):
        """Test successful forgot password request"""
        response = client.post("/api/v1/auth/forgot-password", json={"email": test_user.email})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Password reset email sent"

    def test_forgot_password_nonexistent_email(self, client, db_session):
        """Test forgot password with non-existent email"""
        response = client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent@example.com"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Password reset email sent"

    def test_reset_password_success(self, client, db_session, test_user):
        """Test successful password reset"""
        from scrumix.api.core.security import create_password_reset_token
        
        reset_token = create_password_reset_token(data={"sub": test_user.email})
        
        reset_data = {
            "token": reset_token,
            "new_password": "newpassword123"
        }
        
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Password reset successfully"

    def test_reset_password_invalid_token(self, client, db_session):
        """Test password reset with invalid token"""
        reset_data = {
            "token": "invalid_token",
            "new_password": "newpassword123"
        }
        
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid or expired token" in response.json()["detail"]


class TestSecurity:
    """Test security utilities"""

    def test_create_access_token(self):
        """Test access token creation"""
        from scrumix.api.core.security import create_access_token
        
        data = {"sub": "123", "email": "test@example.com"}
        token = create_access_token(data=data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        """Test refresh token creation"""
        from scrumix.api.core.security import create_refresh_token
        
        data = {"sub": "123", "email": "test@example.com"}
        token = create_refresh_token(data=data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_password(self):
        """Test password verification"""
        from scrumix.api.utils.password import get_password_hash, verify_password
        
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False

    def test_password_hashing(self):
        """Test password hashing"""
        from scrumix.api.utils.password import get_password_hash
        
        password = "testpassword123"
        hashed1 = get_password_hash(password)
        hashed2 = get_password_hash(password)
        
        # Same password should produce different hashes (due to salt)
        assert hashed1 != hashed2
        assert len(hashed1) > 0
        assert len(hashed2) > 0 