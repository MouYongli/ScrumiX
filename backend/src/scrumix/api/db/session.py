# Session 管理
from .database import SessionLocal, get_db

# Re-export get_db for consistency
__all__ = ['get_db', 'SessionLocal']

# Alias for test compatibility
get_session = get_db