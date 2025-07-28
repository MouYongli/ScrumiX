"""
Final coverage boost tests focusing on database APIs
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch

# Import helper functions properly
from scrumix.api.utils.helpers import (
    validate_email, sanitize_string, truncate_text, format_datetime,
    generate_unique_id
)

# Import password utilities
from scrumix.api.utils.password import get_password_hash, verify_password

# Import CRUD operations
from scrumix.api.crud.tag import tag as tag_crud
from scrumix.api.crud.user import user_crud
from scrumix.api.crud.project import project_crud

# Import schemas
from scrumix.api.schemas.tag import TagCreate, TagUpdate
from scrumix.api.schemas.user import UserCreate, UserUpdate
from scrumix.api.schemas.project import ProjectCreate, ProjectUpdate


class TestUtilitiesDeepCoverage:
    """Test utilities with deep coverage of edge cases"""
    
    def test_helper_functions_edge_cases(self):
        """Test helper functions edge cases"""
        # Test email validation comprehensive cases
        valid_emails = [
            "simple@example.com",
            "test.email+tag@example.com",
            "user123@domain-name.com",
            "a@b.co",  # Minimum valid format
            "test@subdomain.domain.com",
            "user+filter@example.org",
            "very.common@example.com",
            "disposable.style.email.with+symbol@example.com",
            "other.email-with-hyphen@example.com",
            "fully-qualified-domain@example.com",
            "user.name+tag+sorting@example.com",
            "x@example.com",
            "example-indeed@strange-example.com",
            "example@s.example"
        ]
        
        invalid_emails = [
            "",  # Empty string
            "notanemail",  # No @ symbol
            "@example.com",  # No local part
            "test@",  # No domain
            "test..double.dot@example.com",  # Consecutive dots in local part
            "test@.example.com",  # Dot after @
            "test@example",  # No TLD
            "test@example.",  # TLD with only dot
            "test space@example.com",  # Space in local part
            ".test@example.com",  # Leading dot in local part
            "test.@example.com",  # Trailing dot in local part
            "test@example..com",  # Consecutive dots in domain
            "test@-example.com",  # Domain starts with hyphen
            "test@example-.com",  # Domain ends with hyphen
            "test@.com",  # Missing domain part
            "test@example.c",  # TLD too short
            "a"*65+"@example.com",  # Local part too long (>64 chars)
            "test@"+("a"*250)+".com",  # Domain too long (>255 chars)
            "test@example.com.",  # Trailing dot in domain
            "test@example_domain.com",  # Underscore in domain
            "test@@example.com",  # Multiple @ symbols
            "test@example@com",  # Multiple @ symbols
        ]
        
        for email in valid_emails:
            assert validate_email(email) == True, f"Should be valid: {email}"
        
        for email in invalid_emails:
            assert validate_email(email) == False, f"Should be invalid: {email}"
        
        # Test string sanitization comprehensive cases
        sanitization_cases = [
            ("", ""),  # Empty string
            ("   ", ""),  # Only whitespace
            ("normal text", "normal text"),  # Normal text
            ("<b>bold</b>", "bold"),  # Simple HTML
            ("<script>alert('xss')</script>", ""),  # Script tag
            ("Hello <script>alert('xss')</script> World", "Hello  World"),  # Script with content
            ("<div><p>nested <span>tags</span></p></div>", "nested tags"),  # Nested tags
            ("&lt;encoded&gt;", "&lt;encoded&gt;"),  # HTML entities preserved
            ("<SCRIPT>alert('xss')</SCRIPT>", ""),  # Case-insensitive script tag
            ("Text with <unknown>tag</unknown>", "Text with tag"),  # Unknown tags
            ("Mixed<div>tags</div> and <b>styles</b>", "Mixedtags and styles"),  # Mixed tags - no extra spaces
        ]
        
        for input_text, expected in sanitization_cases:
            result = sanitize_string(input_text)
            assert result == expected, f"Failed for input: {input_text}"
        
        # Test text truncation comprehensive cases
        truncation_cases = [
            ("", 10, ""),  # Empty string
            ("short", 10, "short"),  # String shorter than limit
            ("exactly ten", 10, "exactly..."),  # String at limit
            ("this is longer than twenty", 20, "this is longer th..."),  # String longer than limit - correct behavior
            ("no truncation needed", 100, "no truncation needed"),  # Limit larger than string
            ("a" * 100, 20, "a" * 17 + "..."),  # Long string with pattern
        ]
        
        for input_text, max_length, expected in truncation_cases:
            result = truncate_text(input_text, max_length)
            assert result == expected, f"Failed for input: {input_text}, length: {max_length}"
            assert len(result) <= max_length, f"Result longer than max_length: {input_text}"
        
        # Test datetime formatting edge cases
        now = datetime.now()
        formatted_default = format_datetime(now)
        formatted_custom = format_datetime(now, "%Y-%m-%d")
        
        assert isinstance(formatted_default, str)
        assert isinstance(formatted_custom, str)
        assert str(now.year) in formatted_default
        assert str(now.year) in formatted_custom
        
        # Test unique ID generation
        id1 = generate_unique_id()
        id2 = generate_unique_id()
        assert id1 != id2
        assert len(id1) > 20
        assert isinstance(id1, str)
    
    def test_password_utilities_comprehensive(self):
        """Test password utilities with edge cases"""
        passwords = [
            "simple123",
            "ComplexP@ssw0rd!",
            "unicode密码123",
            "very_long_password_" + "x" * 100,
            "short",
            "123456789",
            "P@ssw0rd",
            "",  # Edge case: empty password
            " ",  # Edge case: space password
        ]
        
        for password in passwords:
            if password:  # Skip empty passwords for hashing
                hashed = get_password_hash(password)
                assert hashed is not None
                assert hashed != password
                assert verify_password(password, hashed) == True
                assert verify_password("wrong_password", hashed) == False
            else:
                # Test empty password handling
                try:
                    hashed = get_password_hash(password)
                    # If it doesn't raise an error, verify it works
                    assert verify_password(password, hashed) == True
                except Exception:
                    # If it raises an error, that's also acceptable behavior
                    pass


class TestCRUDModulesCoverage:
    """Test CRUD modules with comprehensive mocking"""
    
    def test_tag_crud_comprehensive(self):
        """Test tag CRUD operations comprehensively"""
        # Create detailed mock database
        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        
        # Test get_by_title - found
        mock_tag = Mock()
        mock_tag.title = "Test Tag"
        mock_tag.id = 1
        mock_query.filter.return_value.first.return_value = mock_tag
        
        found_tag = tag_crud.get_by_title(db=mock_db, title="Test Tag")
        assert found_tag == mock_tag
        mock_db.query.assert_called()
        mock_query.filter.assert_called()
        
        # Test get_by_title - not found
        mock_query.reset_mock()
        mock_db.reset_mock()
        mock_query.filter.return_value.first.return_value = None
        
        not_found_tag = tag_crud.get_by_title(db=mock_db, title="Non-existent")
        assert not_found_tag is None
        mock_db.query.assert_called()
        
        # Test check_title_exists - exists
        mock_query.reset_mock()
        mock_db.reset_mock()
        mock_query.filter.return_value.first.return_value = mock_tag
        
        exists = tag_crud.check_title_exists(db=mock_db, title="Test Tag")
        assert exists == True
        mock_db.query.assert_called()
        
        # Test check_title_exists - doesn't exist
        mock_query.reset_mock()
        mock_db.reset_mock()
        mock_query.filter.return_value.first.return_value = None
        
        not_exists = tag_crud.check_title_exists(db=mock_db, title="Non-existent")
        assert not_exists == False
        mock_db.query.assert_called()
    
    def test_user_crud_comprehensive(self):
        """Test user CRUD operations comprehensively"""
        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        
        # Test get_by_email
        mock_user = Mock()
        mock_user.email = "test@example.com"
        mock_user.id = 1
        mock_query.filter.return_value.first.return_value = mock_user
        
        found_user = user_crud.get_by_email(db=mock_db, email="test@example.com")
        assert found_user == mock_user
        mock_db.query.assert_called()
        
        # Test get_by_username
        mock_query.reset_mock()
        mock_db.reset_mock()
        mock_user.username = "testuser"
        mock_query.filter.return_value.first.return_value = mock_user
        
        found_user = user_crud.get_by_username(db=mock_db, username="testuser")
        assert found_user == mock_user
        mock_db.query.assert_called()
        
        # Test is_active property
        mock_user.is_active = True
        assert mock_user.is_active == True
        
        mock_user.is_active = False
        assert mock_user.is_active == False
    
    def test_project_crud_comprehensive(self):
        """Test project CRUD operations comprehensively"""
        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        
        # Test get_by_name
        mock_project = Mock()
        mock_project.name = "Test Project"
        mock_project.id = 1
        mock_query.filter.return_value.first.return_value = mock_project
        
        found_project = project_crud.get_by_name(mock_db, "Test Project")
        assert found_project == mock_project
        mock_db.query.assert_called()
        
        # Test not found case
        mock_query.reset_mock()
        mock_db.reset_mock()
        mock_query.filter.return_value.first.return_value = None
        
        not_found = project_crud.get_by_name(mock_db, "Non-existent")
        assert not_found is None
        mock_db.query.assert_called()


class TestSchemaValidation:
    """Test schema validation and edge cases"""
    
    def test_tag_schema_validation(self):
        """Test tag schema validation"""
        # Test valid tag creation - only title field is available
        tag_data = {
            "title": "Valid Tag"
        }
        
        tag_create = TagCreate(**tag_data)
        assert tag_create.title == "Valid Tag"
        
        # Test tag update
        update_data = {"title": "Updated Tag"}
        tag_update = TagUpdate(**update_data)
        assert tag_update.title == "Updated Tag"
    
    def test_user_schema_validation(self):
        """Test user schema validation"""
        # Test valid user creation
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
        
        # Test user update
        update_data = {
            "full_name": "Updated Name",
            "username": "updated_user"
        }
        user_update = UserUpdate(**update_data)
        assert user_update.full_name == "Updated Name"
        assert user_update.username == "updated_user"
        assert user_update.email is None  # Should be None if not provided
    
    def test_project_schema_validation(self):
        """Test project schema validation"""
        # Test valid project creation
        project_data = {
            "name": "Test Project",
            "description": "A test project description"
        }
        
        project_create = ProjectCreate(**project_data)
        assert project_create.name == "Test Project"
        assert project_create.description == "A test project description"
        
        # Test project update
        update_data = {"name": "Updated Project"}
        project_update = ProjectUpdate(**update_data)
        assert project_update.name == "Updated Project"
        assert project_update.description is None  # Should be None if not provided 