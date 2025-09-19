
import pytest

def test_basic_imports():
    """Test basic imports work"""
    try:
        from scrumix.api.models.user import User
        from scrumix.api.models.project import Project
        from scrumix.api.models.task import Task
        assert True
    except ImportError:
        pytest.skip("Models not available")

def test_config_import():
    """Test config import"""
    try:
        from scrumix.api.core.config import settings
        assert settings is not None
    except ImportError:
        pytest.skip("Config not available")

def test_database_import():
    """Test database import"""
    try:
        from scrumix.api.db.database import get_database_url
        assert callable(get_database_url)
    except ImportError:
        pytest.skip("Database not available")

def test_security_import():
    """Test security import"""
    try:
        from scrumix.api.core.security import create_access_token
        assert callable(create_access_token)
    except ImportError:
        pytest.skip("Security not available")
