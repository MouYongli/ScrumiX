"""
Simple coverage tests focusing on basic API functionality
"""
import pytest
from datetime import datetime, timedelta

# Import core functions that should work
from scrumix.api.core.config import settings
from scrumix.api.core.security import create_access_token, verify_token, get_password_hash, verify_password
from scrumix.api.utils.password import get_password_hash as util_get_password_hash, verify_password as util_verify_password
from scrumix.api.utils.helpers import generate_unique_id, format_datetime, sanitize_string, validate_email, truncate_text

# Import schemas for testing
from scrumix.api.schemas.user import UserCreate, UserUpdate
from scrumix.api.schemas.task import TaskCreate, TaskUpdate
from scrumix.api.schemas.tag import TagCreate, TagUpdate


class TestBasicFunctionality:
    """Test basic API functionality"""
    
    def test_config_access(self):
        """Test configuration access"""
        assert settings is not None
        assert hasattr(settings, 'DATABASE_URL')
        assert hasattr(settings, 'SECRET_KEY')
    
    def test_security_functions(self):
        """Test security utility functions"""
        password = "test_password_123"
        
        # Test password hashing
        hashed = get_password_hash(password)
        assert hashed is not None
        assert hashed != password
        
        # Test password verification
        assert verify_password(password, hashed) == True
        assert verify_password("wrong_password", hashed) == False
        
        # Test utility functions
        util_hashed = util_get_password_hash(password)
        assert util_hashed is not None
        assert util_verify_password(password, util_hashed) == True
    
    def test_jwt_tokens(self):
        """Test JWT token operations"""
        user_data = {"sub": "test@example.com", "user_id": 1}
        
        # Test token creation
        token = create_access_token(data=user_data)
        assert token is not None
        assert isinstance(token, str)
        
        # Test token verification
        payload = verify_token(token)
        assert payload is not None
        assert payload.user_id == "test@example.com"
    
    def test_helper_functions(self):
        """Test helper utility functions"""
        # Test unique ID generation
        unique_id = generate_unique_id()
        assert unique_id is not None
        assert isinstance(unique_id, str)
        assert len(unique_id) > 10
        
        # Test datetime formatting
        now = datetime.now()
        formatted = format_datetime(now)
        assert formatted is not None
        assert isinstance(formatted, str)
        assert str(now.year) in formatted
        
        # Test string sanitization
        dirty_string = "<script>alert('xss')</script>Hello World!"
        clean_string = sanitize_string(dirty_string)
        assert "<script>" not in clean_string
        assert "Hello World!" in clean_string
        
        # Test email validation
        assert validate_email("test@example.com") == True
        assert validate_email("invalid-email") == False
        assert validate_email("test.user+tag@example.co.uk") == True
        
        # Test text truncation
        long_text = "This is a very long text that should be truncated"
        truncated = truncate_text(long_text, 20)
        assert len(truncated) <= 20
        assert truncated.endswith("...")
        
        short_text = "Short"
        not_truncated = truncate_text(short_text, 20)
        assert not_truncated == "Short"


class TestSchemaValidation:
    """Test schema validation and serialization"""
    
    def test_user_schemas(self):
        """Test User schema validation"""
        # Test UserCreate
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "password": "secure_password_123"
        }
        
        user_create = UserCreate(**user_data)
        assert user_create.email == "test@example.com"
        assert user_create.username == "testuser"
        assert user_create.full_name == "Test User"
        assert user_create.password == "secure_password_123"
        
        # Test UserUpdate
        update_data = {
            "full_name": "Updated Name",
            "username": "updated_user"
        }
        user_update = UserUpdate(**update_data)
        assert user_update.full_name == "Updated Name"
        assert user_update.username == "updated_user"
        assert user_update.email is None  # Should be None if not provided
    
    def test_task_schemas(self):
        """Test Task schema validation"""
        # Test TaskCreate
        task_data = {
            "title": "Test Task",
            "description": "A test task description",
            "status": "todo"
        }
        
        task_create = TaskCreate(**task_data)
        assert task_create.title == "Test Task"
        assert task_create.description == "A test task description"
        assert task_create.status.value == "todo"  # Compare enum value
        
        # Test TaskUpdate
        update_data = {
            "title": "Updated Task",
            "status": "in-progress"
        }
        task_update = TaskUpdate(**update_data)
        assert task_update.title == "Updated Task"
        assert task_update.status.value == "in-progress"  # Compare enum value
        assert task_update.description is None  # Should be None if not provided
    
    def test_tag_schemas(self):
        """Test Tag schema validation"""
        # Test TagCreate - only has title field
        tag_data = {
            "title": "Test Tag"
        }
        
        tag_create = TagCreate(**tag_data)
        assert tag_create.title == "Test Tag"
        
        # Test TagUpdate
        update_data = {
            "title": "Updated Tag"
        }
        tag_update = TagUpdate(**update_data)
        assert tag_update.title == "Updated Tag" 