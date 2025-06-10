"""
数据库初始化
"""
from scrumix.api.db.database import create_tables

def init_db():
    """初始化数据库"""
    create_tables() 