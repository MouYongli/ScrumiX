#!/usr/bin/env python3
"""
Quick database creation script for ScrumiX with notifications
"""
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import create_engine
from scrumix.api.db.base import Base
from scrumix.api.core.config import settings

# Import all models to ensure they're registered
from scrumix.api.models.user import User, UserOAuth, UserSession
from scrumix.api.models.project import Project
from scrumix.api.models.sprint import Sprint
from scrumix.api.models.task import Task
from scrumix.api.models.backlog import Backlog
from scrumix.api.models.meeting import Meeting
from scrumix.api.models.meeting_participant import MeetingParticipant
from scrumix.api.models.meeting_agenda import MeetingAgenda
from scrumix.api.models.meeting_note import MeetingNote
from scrumix.api.models.meeting_action_item import MeetingActionItem
from scrumix.api.models.documentation import Documentation
from scrumix.api.models.tag import Tag
from scrumix.api.models.tag_task import TagTask
from scrumix.api.models.tag_documentation import TagDocumentation
from scrumix.api.models.acceptance_criteria import AcceptanceCriteria
from scrumix.api.models.user_project import UserProject
from scrumix.api.models.user_task import UserTask
from scrumix.api.models.user_documentation import UserDocumentation

# Import notification models
from scrumix.api.models.notification import Notification, UserNotification

def create_database():
    """Create all database tables"""
    print("Creating ScrumiX database with notifications...")
    
    # Force SQLite for local development
    db_url = "sqlite:///./scrumix.db"
    print(f"Using database: {db_url}")
    engine = create_engine(db_url)
    
    # Drop all tables (if they exist) and recreate
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database created successfully!")
    print(f"📍 Database location: {settings.SQLALCHEMY_DATABASE_URI}")
    
    # List all created tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n📋 Created {len(tables)} tables:")
    for table in sorted(tables):
        print(f"  ✓ {table}")
    
    # Verify notification tables exist
    if 'notifications' in tables and 'user_notifications' in tables:
        print("\n🔔 Notification system tables created successfully!")
    else:
        print("\n❌ Missing notification tables!")
    
    return True

if __name__ == "__main__":
    try:
        create_database()
        print("\n🎉 Database setup complete! You can now start the application.")
    except Exception as e:
        print(f"\n❌ Error creating database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
