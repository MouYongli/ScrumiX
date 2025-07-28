# 数据库连接和初始化
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scrumix.api.db.base import Base
from scrumix.api.core.config import settings
import os

# 创建数据库引擎
def get_database_url():
    """Get database URL with fallback to SQLite for testing"""
    if hasattr(settings, 'SQLALCHEMY_DATABASE_URI') and settings.SQLALCHEMY_DATABASE_URI:
        return str(settings.SQLALCHEMY_DATABASE_URI)
    
    # Fallback to environment variable or SQLite
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
    return database_url

# 创建数据库引擎
engine = create_engine(get_database_url())

# 创建SessionLocal类
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 获取数据库会话
def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. SessionLocal is None.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 创建数据库表
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