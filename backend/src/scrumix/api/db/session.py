# Session 管理
from .database import SessionLocal

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 

# Alias for test compatibility
get_session = get_db