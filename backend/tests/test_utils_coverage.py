
import pytest
from unittest.mock import Mock, patch
from scrumix.api.utils.password import get_password_hash, verify_password

class TestUtils:
    """Test utility functions"""
    
    def test_password_functions(self):
        """Test password utility functions"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False
