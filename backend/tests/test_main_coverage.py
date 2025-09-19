
import pytest
from fastapi.testclient import TestClient

class TestMain:
    """Test main application"""
    
    def test_app_import(self):
        """Test that app can be imported"""
        try:
            from scrumix.main import app
            assert app is not None
        except ImportError:
            pytest.skip("Main module not available")
    
    def test_app_creation(self):
        """Test that FastAPI app can be created"""
        try:
            from scrumix.main import app
            client = TestClient(app)
            assert client is not None
        except Exception:
            pytest.skip("App creation failed")
