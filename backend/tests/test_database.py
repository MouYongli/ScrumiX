
import pytest
from unittest.mock import Mock, patch
from scrumix.api.db.database import get_db, create_tables, engine, SessionLocal

class TestDatabase:
    """Test database functions"""
    
    def test_get_db(self):
        """Test database session generator"""
        db_gen = get_db()
        db = next(db_gen)
        assert db is not None
        # Close the generator
        try:
            next(db_gen)
        except StopIteration:
            pass
    
    def test_create_tables(self):
        """Test table creation function"""
        # This should not raise an exception
        create_tables()
    
    def test_engine_creation(self):
        """Test that engine is created"""
        assert engine is not None
    
    def test_session_local_creation(self):
        """Test that SessionLocal is created"""
        assert SessionLocal is not None
