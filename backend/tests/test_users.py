"""
User management API tests
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock

from scrumix.api.models.user import UserStatus


class TestUserEndpoints:
    """Test user management endpoints"""

    def test_get_current_user_profile(self, client, auth_headers, test_user):
        """Test getting current user profile"""
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert data["full_name"] == test_user.full_name

    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without authentication"""
        response = client.get("/api/v1/users/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_current_user_profile(self, client, auth_headers, test_user):
        """Test updating current user profile"""
        update_data = {
            "full_name": "Updated Name",
            "timezone": "UTC",
            "language": "en"
        }
        
        response = client.put("/api/v1/users/me", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["timezone"] == update_data["timezone"]
        assert data["language"] == update_data["language"]

    def test_update_current_user_invalid_data(self, client, auth_headers):
        """Test updating current user with invalid data"""
        update_data = {
            "email": "invalid-email"
        }
        
        response = client.put("/api/v1/users/me", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_user_sessions(self, client, auth_headers, test_user):
        """Test getting user sessions"""
        response = client.get("/api/v1/users/me/sessions", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)

    def test_revoke_user_session(self, client, auth_headers, test_user):
        """Test revoking a user session"""
        # First get sessions
        sessions_response = client.get("/api/v1/users/me/sessions", headers=auth_headers)
        assert sessions_response.status_code == status.HTTP_200_OK
        
        sessions = sessions_response.json()
        if sessions:
            session_id = sessions[0]["id"]
            
            response = client.delete(f"/api/v1/users/me/sessions/{session_id}", headers=auth_headers)
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["message"] == "Session revoked successfully"

    def test_revoke_nonexistent_session(self, client, auth_headers):
        """Test revoking a non-existent session"""
        response = client.delete("/api/v1/users/me/sessions/999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_users_as_superuser(self, client, superuser_auth_headers, test_user):
        """Test getting users list as superuser"""
        response = client.get("/api/v1/users/", headers=superuser_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the test user

    def test_get_users_as_regular_user(self, client, auth_headers):
        """Test getting users list as regular user (should fail)"""
        response = client.get("/api/v1/users/", headers=auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_user_by_id_as_superuser(self, client, superuser_auth_headers, test_user):
        """Test getting user by ID as superuser"""
        response = client.get(f"/api/v1/users/{test_user.id}", headers=superuser_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email

    def test_get_user_by_id_as_regular_user(self, client, auth_headers, test_user):
        """Test getting user by ID as regular user (should fail)"""
        response = client.get(f"/api/v1/users/{test_user.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_nonexistent_user(self, client, superuser_auth_headers):
        """Test getting non-existent user"""
        response = client.get("/api/v1/users/999", headers=superuser_auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_user_as_superuser(self, client, superuser_auth_headers, test_user):
        """Test updating user as superuser"""
        update_data = {
            "full_name": "Updated by Admin",
            "is_active": True,
            "is_verified": True
        }
        
        response = client.put(f"/api/v1/users/{test_user.id}", json=update_data, headers=superuser_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["is_active"] == update_data["is_active"]
        assert data["is_verified"] == update_data["is_verified"]

    def test_update_user_as_regular_user(self, client, auth_headers, test_user):
        """Test updating user as regular user (should fail)"""
        update_data = {"full_name": "Updated by Regular User"}
        
        response = client.put(f"/api/v1/users/{test_user.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_user_as_superuser(self, client, superuser_auth_headers, db_session):
        """Test deleting user as superuser"""
        # Create a user to delete
        from scrumix.api.models.user import User
        from scrumix.api.utils.password import get_password_hash
        
        user_to_delete = User(
            email="delete@example.com",
            username="deleteuser",
            full_name="Delete User",
            hashed_password=get_password_hash("password123")
        )
        db_session.add(user_to_delete)
        db_session.commit()
        
        response = client.delete(f"/api/v1/users/{user_to_delete.id}", headers=superuser_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "User deleted successfully"

    def test_delete_user_as_regular_user(self, client, auth_headers, test_user):
        """Test deleting user as regular user (should fail)"""
        response = client.delete(f"/api/v1/users/{test_user.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_nonexistent_user(self, client, superuser_auth_headers):
        """Test deleting non-existent user"""
        response = client.delete("/api/v1/users/999", headers=superuser_auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUserCRUD:
    """Test user CRUD operations"""

    def test_create_user_success(self, db_session):
        """Test successful user creation"""
        from scrumix.api.crud.user import user_crud
        from scrumix.api.schemas.user import UserCreate
        
        user_data = UserCreate(
            email="newuser@example.com",
            username="newuser",
            full_name="New User",
            password="newpassword123"
        )
        
        user = user_crud.create_user(db_session, user_data)
        assert user.email == user_data.email
        assert user.username == user_data.username
        assert user.full_name == user_data.full_name
        assert user.is_active is True
        assert user.is_verified is False

    def test_create_user_duplicate_email(self, db_session, test_user):
        """Test user creation with duplicate email"""
        from scrumix.api.crud.user import user_crud
        from scrumix.api.schemas.user import UserCreate
        
        user_data = UserCreate(
            email=test_user.email,
            username="differentuser",
            full_name="Different User",
            password="password123"
        )
        
        with pytest.raises(ValueError, match="邮箱已被注册"):
            user_crud.create_user(db_session, user_data)

    def test_create_user_duplicate_username(self, db_session, test_user):
        """Test user creation with duplicate username"""
        from scrumix.api.crud.user import user_crud
        from scrumix.api.schemas.user import UserCreate
        
        user_data = UserCreate(
            email="different@example.com",
            username=test_user.username,
            full_name="Different User",
            password="password123"
        )
        
        with pytest.raises(ValueError, match="用户名已被使用"):
            user_crud.create_user(db_session, user_data)

    def test_get_user_by_id(self, db_session, test_user):
        """Test getting user by ID"""
        from scrumix.api.crud.user import user_crud
        
        user = user_crud.get_by_id(db_session, test_user.id)
        assert user is not None
        assert user.email == test_user.email

    def test_get_user_by_email(self, db_session, test_user):
        """Test getting user by email"""
        from scrumix.api.crud.user import user_crud
        
        user = user_crud.get_by_email(db_session, test_user.email)
        assert user is not None
        assert user.id == test_user.id

    def test_get_user_by_username(self, db_session, test_user):
        """Test getting user by username"""
        from scrumix.api.crud.user import user_crud
        
        user = user_crud.get_by_username(db_session, test_user.username)
        assert user is not None
        assert user.id == test_user.id

    def test_authenticate_user_success(self, db_session, test_user):
        """Test successful user authentication"""
        from scrumix.api.crud.user import user_crud
        
        user = user_crud.authenticate(db_session, test_user.email, "testpassword123")
        assert user is not None
        assert user.id == test_user.id

    def test_authenticate_user_wrong_password(self, db_session, test_user):
        """Test user authentication with wrong password"""
        from scrumix.api.crud.user import user_crud
        
        user = user_crud.authenticate(db_session, test_user.email, "wrongpassword")
        assert user is None

    def test_authenticate_nonexistent_user(self, db_session):
        """Test authentication with non-existent user"""
        from scrumix.api.crud.user import user_crud
        
        user = user_crud.authenticate(db_session, "nonexistent@example.com", "password123")
        assert user is None

    def test_update_user(self, db_session, test_user):
        """Test updating user"""
        from scrumix.api.crud.user import user_crud
        from scrumix.api.schemas.user import UserUpdate
        
        update_data = UserUpdate(
            full_name="Updated Name",
            timezone="UTC",
            language="en"
        )
        
        updated_user = user_crud.update_user(db_session, test_user, update_data)
        assert updated_user.full_name == "Updated Name"
        assert updated_user.timezone == "UTC"
        assert updated_user.language == "en"

    def test_get_users_paginated(self, db_session, test_user):
        """Test getting users with pagination"""
        from scrumix.api.crud.user import user_crud
        
        users = user_crud.get_users(db_session, skip=0, limit=10)
        assert isinstance(users, list)
        assert len(users) >= 1  # At least the test user

    def test_is_active_user(self, db_session, test_user):
        """Test checking if user is active"""
        from scrumix.api.crud.user import user_crud
        
        assert user_crud.is_active(test_user) is True
        
        # Test inactive user
        test_user.is_active = False
        db_session.commit()
        assert user_crud.is_active(test_user) is False

    def test_is_superuser(self, db_session, test_user):
        """Test checking if user is superuser"""
        from scrumix.api.crud.user import user_crud
        
        assert user_crud.is_superuser(test_user) is False
        
        # Test superuser
        test_user.is_superuser = True
        db_session.commit()
        assert user_crud.is_superuser(test_user) is True 

    def test_update_last_login(self, db_session, test_user):
        from scrumix.api.crud.user import user_crud
        import time
        user_crud.update_last_login(db_session, test_user.id)
        db_session.refresh(test_user)
        assert test_user.last_login_at is not None

    def test_update_last_login_user_not_found(self, db_session):
        from scrumix.api.crud.user import user_crud
        # Should not raise
        user_crud.update_last_login(db_session, 999999)

    def test_change_password_success(self, db_session, test_user):
        from scrumix.api.crud.user import user_crud
        old_hash = test_user.hashed_password
        result = user_crud.change_password(db_session, test_user.id, "testpassword123", "newpass123")
        db_session.refresh(test_user)
        assert result is True
        assert test_user.hashed_password != old_hash

    def test_change_password_wrong_current(self, db_session, test_user):
        from scrumix.api.crud.user import user_crud
        result = user_crud.change_password(db_session, test_user.id, "wrongpass", "newpass123")
        assert result is False

    def test_change_password_user_not_found(self, db_session):
        from scrumix.api.crud.user import user_crud
        result = user_crud.change_password(db_session, 999999, "any", "newpass123")
        assert result is False

    def test_reset_password_success(self, db_session, test_user):
        from scrumix.api.crud.user import user_crud
        old_hash = test_user.hashed_password
        result = user_crud.reset_password(db_session, test_user.id, "resetpass123")
        db_session.refresh(test_user)
        assert result is True
        assert test_user.hashed_password != old_hash

    def test_reset_password_user_not_found(self, db_session):
        from scrumix.api.crud.user import user_crud
        result = user_crud.reset_password(db_session, 999999, "resetpass123")
        assert result is False

    def test_verify_user_success(self, db_session, test_user):
        from scrumix.api.crud.user import user_crud
        test_user.is_verified = False
        db_session.commit()
        result = user_crud.verify_user(db_session, test_user.id)
        db_session.refresh(test_user)
        assert result is True
        assert test_user.is_verified is True

    def test_verify_user_not_found(self, db_session):
        from scrumix.api.crud.user import user_crud
        result = user_crud.verify_user(db_session, 999999)
        assert result is False

    def test_deactivate_user_success(self, db_session, test_user):
        from scrumix.api.crud.user import user_crud
        test_user.is_active = True
        db_session.commit()
        result = user_crud.deactivate_user(db_session, test_user.id)
        db_session.refresh(test_user)
        assert result is True
        assert test_user.is_active is False

    def test_deactivate_user_not_found(self, db_session):
        from scrumix.api.crud.user import user_crud
        result = user_crud.deactivate_user(db_session, 999999)
        assert result is False 