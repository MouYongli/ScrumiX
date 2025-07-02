"""
Database initialization
"""
from scrumix.api.db.database import create_tables
# Import all models to ensure SQLAlchemy can find them
from scrumix.api.models import User, UserOAuth, UserSession, Project, ProjectStatus, Backlog, BacklogStatus, BacklogPriority, Documentation, DocumentationType

def init_db():
    """Initialize database"""
    create_tables() 