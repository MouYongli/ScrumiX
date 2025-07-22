"""
Comprehensive User CRUD tests for major coverage boost
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from scrumix.api.crud.user import UserCRUD
from scrumix.api.models.user import User
from scrumix.api.schemas.user import UserCreate, UserUpdate


class TestUserCRUDComprehensive:
    """Comprehensive tests for UserCRUD to boost coverage significantly"""

    @pytest.fixture
    def user_crud(self):
        """Create UserCRUD instance"""
        return UserCRUD()

    @pytest.fixture
    def mock_db(self):
        """Create mock database session"""
        return MagicMock(spec=Session)

    @pytest.fixture
    def sample_user(self):
        """Create sample user for testing"""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.username = "testuser"
        user.full_name = "Test User"
        user.hashed_password = "$2b$12$hashed_password"
        user.is_active = True
        user.is_superuser = False
        user.is_verified = True
        user.created_at = datetime.now()
        return user

    def test_create_user_success(self, user_crud, mock_db, sample_user):
        """Test successful user creation"""
        user_create = UserCreate(
            email="new@example.com",
            username="newuser",
            password="password123",
            full_name="New User"
        )
        
        with patch('scrumix.api.crud.user.get_password_hash') as mock_hash:
            mock_hash.return_value = "hashed_password"
            mock_db.add = MagicMock()
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            # Mock that email/username don't exist
            mock_db.query().filter().first.return_value = None
            
            result = user_crud.create(mock_db, obj_in=user_create)
            
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_hash.assert_called_once_with("password123")

    def test_create_user_duplicate_email(self, user_crud, mock_db, sample_user):
        """Test user creation with duplicate email"""
        user_create = UserCreate(
            email="test@example.com",  # Same as existing user
            username="newuser",
            password="password123"
        )
        
        # Mock existing user found
        mock_db.query().filter().first.return_value = sample_user
        
        with pytest.raises(ValueError, match="邮箱已被使用"):
            user_crud.create(mock_db, obj_in=user_create)

    def test_get_by_id_found(self, user_crud, mock_db, sample_user):
        """Test get_by_id when user exists"""
        with patch.object(user_crud, 'get') as mock_get:
            mock_get.return_value = sample_user
            
            result = user_crud.get_by_id(mock_db, 1)
            
            assert result == sample_user
            mock_get.assert_called_once_with(mock_db, 1)

    def test_get_by_email_found(self, user_crud, mock_db, sample_user):
        """Test get_by_email when user exists"""
        mock_db.query().filter().first.return_value = sample_user
        
        result = user_crud.get_by_email(mock_db, "test@example.com")
        
        assert result == sample_user

    def test_get_by_username_found(self, user_crud, mock_db, sample_user):
        """Test get_by_username when user exists"""
        mock_db.query().filter().first.return_value = sample_user
        
        result = user_crud.get_by_username(mock_db, "testuser")
        
        assert result == sample_user

    def test_authenticate_success(self, user_crud, mock_db, sample_user):
        """Test successful authentication"""
        with patch.object(user_crud, 'get_by_email') as mock_get_email, \
             patch('scrumix.api.crud.user.verify_password') as mock_verify:
            
            mock_get_email.return_value = sample_user
            mock_verify.return_value = True
            
            result = user_crud.authenticate(mock_db, "test@example.com", "password123")
            
            assert result == sample_user
            mock_verify.assert_called_once_with("password123", sample_user.hashed_password)

    def test_authenticate_user_not_found(self, user_crud, mock_db):
        """Test authentication when user not found"""
        with patch.object(user_crud, 'get_by_email') as mock_get_email:
            mock_get_email.return_value = None
            
            result = user_crud.authenticate(mock_db, "nonexistent@example.com", "password")
            
            assert result is None

    def test_authenticate_no_password(self, user_crud, mock_db, sample_user):
        """Test authentication when user has no password"""
        sample_user.hashed_password = None
        
        with patch.object(user_crud, 'get_by_email') as mock_get_email:
            mock_get_email.return_value = sample_user
            
            result = user_crud.authenticate(mock_db, "test@example.com", "password")
            
            assert result is None

    def test_authenticate_wrong_password(self, user_crud, mock_db, sample_user):
        """Test authentication with wrong password"""
        with patch.object(user_crud, 'get_by_email') as mock_get_email, \
             patch('scrumix.api.crud.user.verify_password') as mock_verify:
            
            mock_get_email.return_value = sample_user
            mock_verify.return_value = False
            
            result = user_crud.authenticate(mock_db, "test@example.com", "wrongpassword")
            
            assert result is None

    def test_update_user_success(self, user_crud, mock_db, sample_user):
        """Test successful user update"""
        user_update = UserUpdate(full_name="Updated Name")
        
        with patch.object(user_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_user
            mock_db.commit = MagicMock()
            mock_db.refresh = MagicMock()
            
            result = user_crud.update_user(mock_db, 1, user_update)
            
            assert result == sample_user
            mock_db.commit.assert_called_once()

    def test_update_user_not_found(self, user_crud, mock_db):
        """Test update_user when user doesn't exist"""
        user_update = UserUpdate(full_name="Updated Name")
        
        with patch.object(user_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = None
            
            result = user_crud.update_user(mock_db, 999, user_update)
            
            assert result is None

    def test_update_last_login(self, user_crud, mock_db, sample_user):
        """Test update_last_login method"""
        with patch.object(user_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_user
            mock_db.commit = MagicMock()
            
            user_crud.update_last_login(mock_db, 1)
            
            assert sample_user.last_login is not None
            mock_db.commit.assert_called_once()

    def test_change_password_success(self, user_crud, mock_db, sample_user):
        """Test successful password change"""
        with patch.object(user_crud, 'get_by_id') as mock_get_id, \
             patch('scrumix.api.crud.user.verify_password') as mock_verify, \
             patch('scrumix.api.crud.user.get_password_hash') as mock_hash:
            
            mock_get_id.return_value = sample_user
            mock_verify.return_value = True
            mock_hash.return_value = "new_hashed_password"
            mock_db.commit = MagicMock()
            
            result = user_crud.change_password(mock_db, 1, "oldpassword", "newpassword")
            
            assert result is True
            mock_db.commit.assert_called_once()

    def test_change_password_user_not_found(self, user_crud, mock_db):
        """Test change_password when user not found"""
        with patch.object(user_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = None
            
            result = user_crud.change_password(mock_db, 999, "old", "new")
            
            assert result is False

    def test_reset_password_success(self, user_crud, mock_db, sample_user):
        """Test successful password reset"""
        with patch.object(user_crud, 'get_by_id') as mock_get_id, \
             patch('scrumix.api.crud.user.get_password_hash') as mock_hash:
            
            mock_get_id.return_value = sample_user
            mock_hash.return_value = "reset_hashed_password"
            mock_db.commit = MagicMock()
            
            result = user_crud.reset_password(mock_db, 1, "newpassword")
            
            assert result is True
            mock_db.commit.assert_called_once()

    def test_verify_user_success(self, user_crud, mock_db, sample_user):
        """Test successful user verification"""
        sample_user.is_verified = False
        
        with patch.object(user_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_user
            mock_db.commit = MagicMock()
            
            result = user_crud.verify_user(mock_db, 1)
            
            assert result is True
            assert sample_user.is_verified is True
            mock_db.commit.assert_called_once()

    def test_deactivate_user_success(self, user_crud, mock_db, sample_user):
        """Test successful user deactivation"""
        with patch.object(user_crud, 'get_by_id') as mock_get_id:
            mock_get_id.return_value = sample_user
            mock_db.commit = MagicMock()
            
            result = user_crud.deactivate_user(mock_db, 1)
            
            assert result is True
            assert sample_user.is_active is False
            mock_db.commit.assert_called_once()

    def test_get_users_list(self, user_crud, mock_db):
        """Test get_users method"""
        mock_users = [MagicMock(), MagicMock()]
        mock_db.query().order_by().offset().limit().all.return_value = mock_users
        
        result = user_crud.get_users(mock_db, skip=0, limit=10)
        
        assert result == mock_users

    def test_is_active_true(self, user_crud, sample_user):
        """Test is_active method when user is active"""
        sample_user.is_active = True
        
        result = user_crud.is_active(sample_user)
        
        assert result is True

    def test_is_superuser_false(self, user_crud, sample_user):
        """Test is_superuser method when user is not superuser"""
        sample_user.is_superuser = False
        
        result = user_crud.is_superuser(sample_user)
        
        assert result is False

    def test_create_session_success(self, user_crud, mock_db):
        """Test create_session method"""
        expires_at = datetime.now() + timedelta(hours=24)
        
        mock_db.add = MagicMock()
        mock_db.commit = MagicMock()
        mock_db.refresh = MagicMock()
        
        result = user_crud.create_session(
            mock_db, 
            user_id=1, 
            expires_at=expires_at,
            session_token="session_token",
            refresh_token="refresh_token"
        )
        
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_get_by_session_token_found(self, user_crud, mock_db):
        """Test get_by_session_token when session exists"""
        mock_session = MagicMock()
        mock_db.query().filter().first.return_value = mock_session
        
        result = user_crud.get_by_session_token(mock_db, "session_token")
        
        assert result == mock_session

    def test_update_activity_success(self, user_crud, mock_db):
        """Test update_activity method"""
        mock_session = MagicMock()
        mock_db.query().filter().first.return_value = mock_session
        mock_db.commit = MagicMock()
        
        result = user_crud.update_activity(mock_db, 1)
        
        assert result is True
        mock_db.commit.assert_called_once()

    def test_deactivate_session_success(self, user_crud, mock_db):
        """Test deactivate_session method"""
        mock_session = MagicMock()
        mock_db.query().filter().first.return_value = mock_session
        mock_db.commit = MagicMock()
        
        result = user_crud.deactivate_session(mock_db, 1)
        
        assert result is True
        assert mock_session.is_active is False
        mock_db.commit.assert_called_once()

    def test_cleanup_expired_sessions(self, user_crud, mock_db):
        """Test cleanup_expired_sessions method"""
        mock_db.query().filter().delete.return_value = 5  # 5 sessions deleted
        mock_db.commit = MagicMock()
        
        result = user_crud.cleanup_expired_sessions(mock_db)
        
        assert result == 5
        mock_db.commit.assert_called_once() 