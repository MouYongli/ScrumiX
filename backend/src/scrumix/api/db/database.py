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
    # Check for explicit DATABASE_URL environment variable first
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        # If it's a PostgreSQL URL, test if it works, otherwise fallback to SQLite
        if database_url.startswith('postgresql://'):
            try:
                import psycopg2
                # Quick connection test
                psycopg2.connect(database_url, connect_timeout=2)
                return database_url
            except Exception:
                print("PostgreSQL connection failed, falling back to SQLite")
                return settings.DATABASE_URL
        return database_url
    
    # Try the constructed PostgreSQL URI from settings (but test it first)
    if hasattr(settings, 'SQLALCHEMY_DATABASE_URI') and settings.SQLALCHEMY_DATABASE_URI:
        pg_url = str(settings.SQLALCHEMY_DATABASE_URI)
        try:
            import psycopg2
            psycopg2.connect(pg_url, connect_timeout=2)
            return pg_url
        except Exception:
            print("PostgreSQL connection failed, falling back to SQLite")
            return settings.DATABASE_URL
    
    # Fallback to SQLite from settings
    return settings.DATABASE_URL

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