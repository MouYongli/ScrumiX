# Database connection and initialization
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scrumix.api.db.base import Base
from scrumix.api.core.config import settings
from scrumix.api.db.models import *  # Import all models
import os
import logging

# Set up logging
logger = logging.getLogger(__name__)

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

# Create database engine with optimized settings
def create_database_engine():
    """Create database engine with environment-specific optimizations"""
    database_url = get_database_url()
    
    # Base engine configuration
    engine_kwargs = {
        "echo": False,  # Disable SQL logging to reduce noise
        "pool_pre_ping": True,  # Verify connections before use
        "pool_recycle": settings.DB_POOL_RECYCLE,    # Recycle connections
    }
    
    # PostgreSQL-specific optimizations
    if database_url.startswith('postgresql'):
        engine_kwargs.update({
            "pool_size": settings.DB_POOL_SIZE,         # Configurable connection pool size
            "max_overflow": settings.DB_MAX_OVERFLOW,   # Configurable max connections beyond pool_size
            "pool_timeout": settings.DB_POOL_TIMEOUT,   # Configurable timeout when getting connection from pool
            "connect_args": {
                "connect_timeout": 10,
                "application_name": f"scrumix-{settings.ENVIRONMENT}"
            }
        })
    
    return create_engine(database_url, **engine_kwargs)

# Create database engine
engine = create_database_engine()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Get database session
def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. SessionLocal is None.")
    
    db = None
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        if db:
            db.rollback()
        raise
    finally:
        if db:
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

# Connection pool health check
def get_connection_pool_status():
    """Get current connection pool status for monitoring"""
    if hasattr(engine.pool, 'size'):
        return {
            "pool_size": engine.pool.size(),
            "checked_in": engine.pool.checkedin(),
            "checked_out": engine.pool.checkedout(),
            "overflow": engine.pool.overflow(),
            "invalid": engine.pool.invalid()
        }
    return {"status": "pool_info_not_available"}

# Health check endpoint data
def get_database_health():
    """Get database health information"""
    try:
        pool_status = get_connection_pool_status()
        return {
            "status": "healthy",
            "pool_status": pool_status,
            "database_url": SQLALCHEMY_DATABASE_URL.split('@')[-1] if '@' in SQLALCHEMY_DATABASE_URL else "local"
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }