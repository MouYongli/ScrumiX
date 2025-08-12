# Database connection and initialization
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scrumix.api.db.base import Base
from scrumix.api.core.config import settings
from scrumix.api.db.models import *  # Import all models
import os

# Create database engine
def get_database_url():
    """Get database URL with fallback to SQLite for testing"""
    if hasattr(settings, 'SQLALCHEMY_DATABASE_URI') and settings.SQLALCHEMY_DATABASE_URI:
        return str(settings.SQLALCHEMY_DATABASE_URI)
    
    # Fallback to environment variable or SQLite
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
    return database_url

# Create database engine
engine = create_engine(get_database_url())

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Get database session
def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. SessionLocal is None.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create database tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Alias for test compatibility
get_session = get_db

# Additional functions for testing
def create_all_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

# Database URL for configuration
SQLALCHEMY_DATABASE_URL = get_database_url()