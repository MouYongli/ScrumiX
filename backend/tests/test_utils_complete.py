"""
Complete tests for utility modules (password.py, database.py)
"""
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from scrumix.api.utils.password import verify_password, get_password_hash
from scrumix.api.db.database import get_db, create_tables, create_all_tables


class TestPasswordUtils:
    """Test password utility functions"""

    def test_get_password_hash(self):
        """Test password hashing"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        # Verify hash is created
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password  # Hash should be different from plain text
        
        # Verify hash is consistent bcrypt format
        assert hashed.startswith('$2b$')

    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "correct_password_456"
        hashed = get_password_hash(password)
        
        # Verify correct password
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "correct_password_789"
        wrong_password = "wrong_password_789"
        hashed = get_password_hash(password)
        
        # Verify incorrect password
        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty(self):
        """Test password verification with empty password"""
        password = "test_password"
        hashed = get_password_hash(password)
        
        # Verify empty password fails
        assert verify_password("", hashed) is False

    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes"""
        password1 = "password_one"
        password2 = "password_two"
        
        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)
        
        assert hash1 != hash2

    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = "same_password"
        
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Due to salt, hashes should be different
        assert hash1 != hash2
        
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestDatabaseUtils:
    """Test database utility functions"""

    def test_get_db_generator(self):
        """Test get_db function returns a generator"""
        db_gen = get_db()
        assert hasattr(db_gen, '__iter__')
        assert hasattr(db_gen, '__next__')

    @patch('scrumix.api.db.database.SessionLocal')
    def test_get_db_session_lifecycle(self, mock_session_local):
        """Test get_db properly manages session lifecycle"""
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session
        
        # Use the generator
        db_gen = get_db()
        session = next(db_gen)
        
        # Verify session is returned
        assert session == mock_session
        mock_session_local.assert_called_once()
        
        # Verify session is closed when generator ends
        try:
            next(db_gen)
        except StopIteration:
            pass
        
        mock_session.close.assert_called_once()

    @patch('scrumix.api.db.database.Base')
    def test_create_tables(self, mock_base):
        """Test create_tables function"""
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata
        
        create_tables()
        
        mock_metadata.create_all.assert_called_once()

    @patch('scrumix.api.db.database.Base')
    def test_create_all_tables(self, mock_base):
        """Test create_all_tables function"""
        mock_metadata = MagicMock()
        mock_base.metadata = mock_metadata
        
        create_all_tables()
        
        mock_metadata.create_all.assert_called_once()

    @patch('scrumix.api.db.database.SessionLocal')
    def test_get_db_exception_handling(self, mock_session_local):
        """Test get_db handles exceptions properly"""
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session
        
        # Simulate exception during session use
        mock_session.execute.side_effect = Exception("Database error")
        
        db_gen = get_db()
        session = next(db_gen)
        
        # Even if there's an exception, session should be closed
        try:
            session.execute("SELECT 1")
        except Exception:
            pass
        
        # Complete the generator to trigger finally block
        try:
            next(db_gen)
        except StopIteration:
            pass
        
        # Verify session was closed despite exception
        mock_session.close.assert_called_once()

    def test_database_url_configuration(self):
        """Test that database URL is properly configured"""
        from scrumix.api.db.database import SQLALCHEMY_DATABASE_URL
        
        assert isinstance(SQLALCHEMY_DATABASE_URL, str)
        assert len(SQLALCHEMY_DATABASE_URL) > 0
        
        # Should be either SQLite or PostgreSQL URL
        assert SQLALCHEMY_DATABASE_URL.startswith(('sqlite:', 'postgresql:'))

    def test_get_session_alias(self):
        """Test that get_session is properly aliased to get_db"""
        from scrumix.api.db.database import get_session, get_db
        
        assert get_session == get_db 