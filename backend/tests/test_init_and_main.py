"""
Tests for database initialization and main entry point
"""
import pytest
import os
from unittest.mock import patch, MagicMock
import sys


class TestInitDB:
    """Test database initialization"""

    @patch('scrumix.api.core.init_db.create_tables')
    def test_init_db(self, mock_create_tables):
        """Test database initialization"""
        from scrumix.api.core.init_db import init_db
        
        # Call the function
        init_db()
        
        # Verify create_tables was called
        mock_create_tables.assert_called_once()


class TestMain:
    """Test main entry point"""

    def test_main_imports(self):
        """Test that main module can be imported"""
        import scrumix.main
        assert hasattr(scrumix.main, 'app')

    @patch.dict(os.environ, {"POSTGRES_SERVER": "localhost", "POSTGRES_PASSWORD": "password"})
    @patch('scrumix.api.core.init_db.init_db')
    @patch('builtins.print')
    def test_main_with_postgres_success(self, mock_print, mock_init_db):
        """Test main module initialization with PostgreSQL environment - success"""
        # Mock successful init_db
        mock_init_db.return_value = None
        
        # Import main module (this triggers the initialization code)
        if 'scrumix.main' in sys.modules:
            del sys.modules['scrumix.main']
        
        import scrumix.main
        
        # Verify init_db was called and success message printed
        mock_init_db.assert_called_once()
        mock_print.assert_called_with("Database initialized successfully")

    @patch.dict(os.environ, {"POSTGRES_SERVER": "localhost", "POSTGRES_PASSWORD": "password"})
    @patch('scrumix.api.core.init_db.init_db', side_effect=Exception("Database connection failed"))
    @patch('builtins.print')
    def test_main_with_postgres_failure(self, mock_print, mock_init_db):
        """Test main module initialization with PostgreSQL environment - failure"""
        # Import main module (this triggers the initialization code)
        if 'scrumix.main' in sys.modules:
            del sys.modules['scrumix.main']
        
        import scrumix.main
        
        # Verify init_db was called and error messages printed
        mock_init_db.assert_called_once()
        mock_print.assert_any_call("Warning: Could not initialize database: Database connection failed")
        mock_print.assert_any_call("Application will start without database connection")

    @patch.dict(os.environ, {}, clear=True)
    @patch('scrumix.api.core.init_db.init_db')
    @patch('builtins.print')
    def test_main_without_postgres_env(self, mock_print, mock_init_db):
        """Test main module initialization without PostgreSQL environment"""
        # Import main module (this triggers the initialization code)
        if 'scrumix.main' in sys.modules:
            del sys.modules['scrumix.main']
        
        import scrumix.main
        
        # Verify init_db was NOT called since env vars are missing
        mock_init_db.assert_not_called()
        # No database initialization messages should be printed
        mock_print.assert_not_called()

    @patch.dict(os.environ, {"POSTGRES_SERVER": "localhost"})  # Missing password
    @patch('scrumix.api.core.init_db.init_db')
    @patch('builtins.print')
    def test_main_partial_postgres_env(self, mock_print, mock_init_db):
        """Test main module initialization with partial PostgreSQL environment"""
        # Import main module (this triggers the initialization code)
        if 'scrumix.main' in sys.modules:
            del sys.modules['scrumix.main']
        
        import scrumix.main
        
        # Verify init_db was NOT called since password is missing
        mock_init_db.assert_not_called()
        # No database initialization messages should be printed
        mock_print.assert_not_called()

    @patch('uvicorn.run')
    def test_main_entry_point(self, mock_uvicorn_run):
        """Test main entry point when run as script"""
        # Import and run the main section
        from scrumix.main import app
        import scrumix.main
        
        # Simulate running as main script
        if scrumix.main.__name__ == "__main__":
            # This would be called if run as script
            # We can't easily test this without subprocess, so we test the components
            pass
        
        # Test that app is imported correctly
        assert app is not None 