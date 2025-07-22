# 数据库连接和初始化
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scrumix.api.db.base import Base
from scrumix.api.core.config import settings

# 创建数据库引擎
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# 创建SessionLocal类
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 获取数据库会话
def get_db():
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
SQLALCHEMY_DATABASE_URL = str(settings.SQLALCHEMY_DATABASE_URI)