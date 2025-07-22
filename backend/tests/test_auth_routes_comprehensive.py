"""
Comprehensive Auth Routes tests for major coverage boost (Non-OAuth focus)
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import status
from sqlalchemy.orm import Session

from scrumix.api.app import app
from scrumix.api.schemas.user import UserCreate, LoginRequest, ChangePasswordRequest, PasswordResetRequest


class TestAuthRoutesComprehensive:
    """Comprehensive tests for auth routes to boost coverage significantly"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_db(self):
        """Create mock database session"""
        return MagicMock(spec=Session)

    @pytest.fixture
    def sample_user(self):
        """Create sample user for testing"""
        user = MagicMock()
        user.id = 1
        user.email = "test@example.com"
        user.username = "testuser"
        user.full_name = "Test User"
        user.is_active = True
        user.is_verified = True
        return user

    def test_register_success(self, client):
        """Test successful user registration"""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "password123",
            "full_name": "New User"
        }
        
        with patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_user = MagicMock()
            mock_user.id = 1
            mock_user.email = user_data["email"]
            mock_user.username = user_data["username"]
            mock_user.full_name = user_data["full_name"]
            mock_user.is_active = True
            
            mock_user_crud.create_user.return_value = mock_user
            
            response = client.post("/auth/register", json=user_data)
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["email"] == user_data["email"]
            assert response.json()["username"] == user_data["username"]

    def test_register_no_password(self, client):
        """Test registration without password fails"""
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User"
            # Missing password
        }
        
        with patch('scrumix.api.routes.auth.get_db'):
            response = client.post("/auth/register", json=user_data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Password is required" in response.json()["detail"]

    def test_register_duplicate_user(self, client):
        """Test registration with duplicate user fails"""
        user_data = {
            "email": "existing@example.com",
            "username": "existing",
            "password": "password123",
            "full_name": "Existing User"
        }
        
        with patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_user_crud.create_user.side_effect = ValueError("邮箱已被注册")
            
            response = client.post("/auth/register", json=user_data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "邮箱已被注册" in response.json()["detail"]

    def test_login_success(self, client, sample_user):
        """Test successful login"""
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        with patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.create_access_token') as mock_create_access, \
             patch('scrumix.api.routes.auth.create_refresh_token') as mock_create_refresh, \
             patch('scrumix.api.routes.auth.session_crud') as mock_session_crud, \
             patch('scrumix.api.routes.auth.set_access_token_cookie') as mock_set_access, \
             patch('scrumix.api.routes.auth.set_refresh_token_cookie') as mock_set_refresh:
            
            mock_user_crud.authenticate.return_value = sample_user
            mock_create_access.return_value = "access_token"
            mock_create_refresh.return_value = "refresh_token"
            mock_session_crud.create_session.return_value = MagicMock()
            
            response = client.post("/auth/login", json=login_data)
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["access_token"] == "access_token"
            assert response.json()["token_type"] == "bearer"
            assert response.json()["user"]["email"] == sample_user.email

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        login_data = {
            "email": "wrong@example.com",
            "password": "wrongpassword"
        }
        
        with patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_user_crud.authenticate.return_value = None
            
            response = client.post("/auth/login", json=login_data)
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Incorrect email or password" in response.json()["detail"]

    def test_login_inactive_user(self, client, sample_user):
        """Test login with inactive user"""
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        sample_user.is_active = False
        
        with patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_user_crud.authenticate.return_value = sample_user
            
            response = client.post("/auth/login", json=login_data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Inactive user" in response.json()["detail"]

    def test_logout_success(self, client):
        """Test successful logout"""
        with patch('scrumix.api.routes.auth.get_current_user') as mock_get_user, \
             patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.session_crud') as mock_session_crud, \
             patch('scrumix.api.routes.auth.get_session_cookie') as mock_get_session, \
             patch('scrumix.api.routes.auth.clear_auth_cookies') as mock_clear_cookies:
            
            mock_user = MagicMock()
            mock_user.id = 1
            mock_get_user.return_value = mock_user
            mock_get_session.return_value = "session_token"
            mock_session_crud.deactivate_user_sessions.return_value = 1
            
            response = client.post("/auth/logout")
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["message"] == "Successfully logged out"

    def test_refresh_token_success(self, client, sample_user):
        """Test successful token refresh"""
        with patch('scrumix.api.routes.auth.get_refresh_token_from_cookie') as mock_get_refresh, \
             patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.session_crud') as mock_session_crud, \
             patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.create_access_token') as mock_create_access, \
             patch('scrumix.api.routes.auth.create_refresh_token') as mock_create_refresh, \
             patch('scrumix.api.routes.auth.set_access_token_cookie') as mock_set_access, \
             patch('scrumix.api.routes.auth.set_refresh_token_cookie') as mock_set_refresh:
            
            mock_session = MagicMock()
            mock_session.user_id = 1
            mock_session.is_active = True
            mock_session.expires_at = datetime.now() + timedelta(days=1)
            
            mock_get_refresh.return_value = "refresh_token"
            mock_session_crud.get_by_refresh_token.return_value = mock_session
            mock_user_crud.get_by_id.return_value = sample_user
            mock_create_access.return_value = "new_access_token"
            mock_create_refresh.return_value = "new_refresh_token"
            
            response = client.post("/auth/refresh")
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["access_token"] == "new_access_token"

    def test_refresh_token_no_token(self, client):
        """Test token refresh without refresh token"""
        with patch('scrumix.api.routes.auth.get_refresh_token_from_cookie') as mock_get_refresh, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_get_refresh.return_value = None
            
            response = client.post("/auth/refresh")
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "No refresh token found" in response.json()["detail"]

    def test_refresh_token_invalid_session(self, client):
        """Test token refresh with invalid session"""
        with patch('scrumix.api.routes.auth.get_refresh_token_from_cookie') as mock_get_refresh, \
             patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.session_crud') as mock_session_crud:
            
            mock_get_refresh.return_value = "invalid_refresh_token"
            mock_session_crud.get_by_refresh_token.return_value = None
            
            response = client.post("/auth/refresh")
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid refresh token" in response.json()["detail"]

    def test_change_password_success(self, client, sample_user):
        """Test successful password change"""
        password_data = {
            "current_password": "oldpassword",
            "new_password": "newpassword123"
        }
        
        with patch('scrumix.api.routes.auth.get_current_user') as mock_get_user, \
             patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.user_crud') as mock_user_crud:
            
            mock_get_user.return_value = sample_user
            mock_user_crud.change_password.return_value = True
            
            response = client.post("/auth/change-password", json=password_data)
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["message"] == "Password successfully changed"

    def test_change_password_failure(self, client, sample_user):
        """Test password change failure"""
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        
        with patch('scrumix.api.routes.auth.get_current_user') as mock_get_user, \
             patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.user_crud') as mock_user_crud:
            
            mock_get_user.return_value = sample_user
            mock_user_crud.change_password.return_value = False
            
            response = client.post("/auth/change-password", json=password_data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Failed to change password" in response.json()["detail"]

    def test_request_password_reset_success(self, client, sample_user):
        """Test successful password reset request"""
        reset_data = {
            "email": "test@example.com"
        }
        
        with patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.user_crud') as mock_user_crud, \
             patch('scrumix.api.routes.auth.create_password_reset_token') as mock_create_token:
            
            mock_user_crud.get_by_email.return_value = sample_user
            mock_create_token.return_value = "reset_token"
            
            response = client.post("/auth/request-password-reset", json=reset_data)
            
            assert response.status_code == status.HTTP_200_OK
            assert "Password reset email sent" in response.json()["message"]

    def test_request_password_reset_user_not_found(self, client):
        """Test password reset request for non-existent user"""
        reset_data = {
            "email": "nonexistent@example.com"
        }
        
        with patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.user_crud') as mock_user_crud:
            
            mock_user_crud.get_by_email.return_value = None
            
            response = client.post("/auth/request-password-reset", json=reset_data)
            
            # Should still return success for security reasons
            assert response.status_code == status.HTTP_200_OK
            assert "Password reset email sent" in response.json()["message"]

    def test_confirm_password_reset_success(self, client, sample_user):
        """Test successful password reset confirmation"""
        confirm_data = {
            "token": "valid_reset_token",
            "new_password": "newpassword123"
        }
        
        with patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.verify_password_reset_token') as mock_verify, \
             patch('scrumix.api.routes.auth.user_crud') as mock_user_crud:
            
            mock_verify.return_value = sample_user.email
            mock_user_crud.get_by_email.return_value = sample_user
            mock_user_crud.reset_password.return_value = True
            
            response = client.post("/auth/confirm-password-reset", json=confirm_data)
            
            assert response.status_code == status.HTTP_200_OK
            assert "Password successfully reset" in response.json()["message"]

    def test_confirm_password_reset_invalid_token(self, client):
        """Test password reset confirmation with invalid token"""
        confirm_data = {
            "token": "invalid_token",
            "new_password": "newpassword123"
        }
        
        with patch('scrumix.api.routes.auth.get_db'), \
             patch('scrumix.api.routes.auth.verify_password_reset_token') as mock_verify:
            
            mock_verify.return_value = None
            
            response = client.post("/auth/confirm-password-reset", json=confirm_data)
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid or expired reset token" in response.json()["detail"]

    def test_get_current_user_info_success(self, client, sample_user):
        """Test getting current user info"""
        with patch('scrumix.api.routes.auth.get_current_user') as mock_get_user, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_get_user.return_value = sample_user
            
            response = client.get("/auth/me")
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["email"] == sample_user.email
            assert response.json()["username"] == sample_user.username

    def test_verify_authentication_success(self, client, sample_user):
        """Test authentication verification"""
        with patch('scrumix.api.routes.auth.get_current_user') as mock_get_user, \
             patch('scrumix.api.routes.auth.get_db'):
            
            mock_get_user.return_value = sample_user
            
            response = client.get("/auth/verify")
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["authenticated"] is True
            assert response.json()["user"]["email"] == sample_user.email 