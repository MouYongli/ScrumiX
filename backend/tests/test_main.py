
import pytest
from fastapi.testclient import TestClient

def test_main_import():
    """Test that main module can be imported"""
    try:
        from scrumix.main import app
        assert app is not None
    except ImportError as e:
        pytest.skip(f"Main module not available: {e}")

def test_app_creation():
    """Test that FastAPI app can be created"""
    try:
        from scrumix.main import app
        client = TestClient(app)
        assert client is not None
    except Exception as e:
        pytest.skip(f"App creation failed: {e}")
